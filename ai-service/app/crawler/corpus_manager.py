# ai-service/app/crawler/corpus_manager.py
import sqlite3
import json
import logging
from typing import List, Dict, Optional
from datetime import datetime
import os

logger = logging.getLogger(__name__)

class CorpusManager:
    """
    Gère le stockage temporaire des données scrapées en SQLite
    avant l'envoi vers PostgreSQL via Prisma
    """
    
    def __init__(self, db_path: str = "scraped_data.db"):
        self.db_path = os.path.join(os.path.dirname(__file__), db_path)
        self._init_database()
    
    def _init_database(self):
        """Initialise la base SQLite pour le stockage temporaire"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scraped_problems (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content_hash TEXT UNIQUE,
                source TEXT,
                title TEXT,
                content TEXT,
                language TEXT,
                difficulty TEXT,
                original_tags TEXT,  -- JSON array
                technical_features TEXT,  -- JSON object
                source_url TEXT,
                source_votes INTEGER DEFAULT 0,
                source_answers INTEGER DEFAULT 0,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                processing_status TEXT DEFAULT 'raw_scraped',
                sent_to_main_db BOOLEAN DEFAULT FALSE,
                sent_at TIMESTAMP NULL
            )
        ''')
        
        # Index pour les performances
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_content_hash ON scraped_problems(content_hash)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_processing_status ON scraped_problems(processing_status)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_sent_to_main_db ON scraped_problems(sent_to_main_db)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_language ON scraped_problems(language)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON scraped_problems(source)')
        
        conn.commit()
        conn.close()
        logger.info(f"✅ SQLite database initialized at {self.db_path}")
    
    def save_scraped_problems(self, problems: List[Dict]) -> int:
        """Sauvegarde les problèmes scrapés dans SQLite"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        saved_count = 0
        for problem in problems:
            try:
                cursor.execute('''
                    INSERT OR IGNORE INTO scraped_problems 
                    (content_hash, source, title, content, language, difficulty, 
                     original_tags, technical_features, source_url, source_votes, source_answers)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    problem.get('content_hash', ''),
                    problem.get('source', 'unknown'),
                    problem.get('title', ''),
                    problem.get('content', ''),
                    problem.get('language', 'unknown'),
                    problem.get('difficulty', 'medium'),
                    json.dumps(problem.get('tags', [])),
                    json.dumps(problem.get('technical_features', {})),
                    problem.get('full_question_url', ''),
                    problem.get('votes', 0),
                    problem.get('answers', 0)
                ))
                
                if cursor.rowcount > 0:
                    saved_count += 1
                    logger.debug(f"💾 Saved new problem: {problem.get('title', '')[:50]}...")
                else:
                    logger.debug(f"⏭️  Skipped duplicate: {problem.get('title', '')[:50]}...")
                    
            except Exception as e:
                logger.error(f"❌ Error saving problem to SQLite: {e}")
                continue
        
        conn.commit()
        conn.close()
        logger.info(f"💾 Saved {saved_count} new problems to SQLite corpus")
        return saved_count
    
    def get_unprocessed_problems(self, limit: int = 50) -> List[Dict]:
        """Récupère les problèmes non traités"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT * FROM scraped_problems 
            WHERE sent_to_main_db = FALSE 
            AND processing_status = 'raw_scraped'
            ORDER BY scraped_at DESC 
            LIMIT ?
        ''', (limit,))
        
        rows = cursor.fetchall()
        problems = []
        
        for row in rows:
            problem = dict(row)
            # Convertir les champs JSON
            problem['original_tags'] = json.loads(problem['original_tags'])
            problem['technical_features'] = json.loads(problem['technical_features'])
            problems.append(problem)
        
        conn.close()
        logger.info(f"📥 Retrieved {len(problems)} unprocessed problems")
        return problems
    
    def mark_as_processed(self, content_hash: str):
        """Marque un problème comme traité et envoyé à PostgreSQL"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE scraped_problems 
            SET sent_to_main_db = TRUE, 
                sent_at = CURRENT_TIMESTAMP,
                processing_status = 'sent_to_main_db'
            WHERE content_hash = ?
        ''', (content_hash,))
        
        conn.commit()
        conn.close()
        logger.info(f"✅ Marked problem {content_hash} as processed")
    
    def update_processing_status(self, content_hash: str, status: str):
        """Met à jour le statut de traitement d'un problème"""
        valid_statuses = ['raw_scraped', 'processing', 'ai_enhanced', 'ready_for_review', 'sent_to_main_db']
        
        if status not in valid_statuses:
            logger.error(f"❌ Invalid status: {status}. Must be one of {valid_statuses}")
            return
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            UPDATE scraped_problems 
            SET processing_status = ?
            WHERE content_hash = ?
        ''', (status, content_hash))
        
        conn.commit()
        conn.close()
        logger.info(f"🔄 Updated problem {content_hash} status to: {status}")
    
    def get_corpus_stats(self) -> Dict[str, any]:
        """Retourne les statistiques du corpus"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Total problems
        cursor.execute('SELECT COUNT(*) as total FROM scraped_problems')
        total = cursor.fetchone()[0]
        
        # Unprocessed problems
        cursor.execute('SELECT COUNT(*) as unprocessed FROM scraped_problems WHERE sent_to_main_db = FALSE')
        unprocessed = cursor.fetchone()[0]
        
        # By source
        cursor.execute('SELECT source, COUNT(*) as count FROM scraped_problems GROUP BY source')
        by_source = {row[0]: row[1] for row in cursor.fetchall()}
        
        # By language
        cursor.execute('SELECT language, COUNT(*) as count FROM scraped_problems GROUP BY language')
        by_language = {row[0]: row[1] for row in cursor.fetchall()}
        
        # By processing status
        cursor.execute('SELECT processing_status, COUNT(*) as count FROM scraped_problems GROUP BY processing_status')
        by_status = {row[0]: row[1] for row in cursor.fetchall()}
        
        # Recent activity
        cursor.execute('SELECT COUNT(*) as recent FROM scraped_problems WHERE scraped_at > datetime("now", "-1 day")')
        recent_24h = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_problems": total,
            "unprocessed": unprocessed,
            "recent_24h": recent_24h,
            "by_source": by_source,
            "by_language": by_language,
            "by_processing_status": by_status,
            "database_path": self.db_path,
            "database_size_mb": self._get_database_size()
        }
    
    def _get_database_size(self) -> float:
        """Retourne la taille de la base de données en MB"""
        try:
            size_bytes = os.path.getsize(self.db_path)
            return round(size_bytes / (1024 * 1024), 2)
        except:
            return 0.0
    
    def search_problems(self, query: str, language: str = None, source: str = None, limit: int = 20) -> List[Dict]:
        """Recherche des problèmes dans le corpus"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        sql = '''
            SELECT * FROM scraped_problems 
            WHERE (title LIKE ? OR content LIKE ?)
        '''
        params = [f'%{query}%', f'%{query}%']
        
        if language and language != 'all':
            sql += ' AND language = ?'
            params.append(language)
            
        if source and source != 'all':
            sql += ' AND source = ?'
            params.append(source)
            
        sql += ' ORDER BY scraped_at DESC LIMIT ?'
        params.append(limit)
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        
        problems = []
        for row in rows:
            problem = dict(row)
            problem['original_tags'] = json.loads(problem['original_tags'])
            problem['technical_features'] = json.loads(problem['technical_features'])
            problems.append(problem)
        
        conn.close()
        return problems
    
    def clear_old_data(self, days: int = 30):
        """Supprime les anciennes données (maintenance)"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            DELETE FROM scraped_problems 
            WHERE scraped_at < datetime("now", ?)
        ''', (f"-{days} days",))
        
        deleted_count = cursor.rowcount
        conn.commit()
        conn.close()
        
        logger.info(f"🧹 Cleared {deleted_count} problems older than {days} days")
        return deleted_count

# Test du corpus manager
if __name__ == "__main__":
    print("🧪 Testing Corpus Manager...")
    
    manager = CorpusManager()
    stats = manager.get_corpus_stats()
    print("📊 Initial Corpus Stats:", stats)
    
    # Test avec des données d'exemple
    test_problems = [{
        'content_hash': 'test_hash_123',
        'source': 'stackoverflow',
        'title': 'Test Problem - How to fix Python error?',
        'content': 'Test content for corpus manager with some technical details about Python errors.',
        'language': 'python',
        'difficulty': 'medium',
        'tags': ['python', 'error', 'debugging'],
        'technical_features': {'has_code': True, 'has_error_message': True},
        'full_question_url': 'https://stackoverflow.com/questions/1234567',
        'votes': 10,
        'answers': 2
    }]
    
    saved = manager.save_scraped_problems(test_problems)
    print(f"💾 Saved {saved} test problems")
    
    stats_after = manager.get_corpus_stats()
    print("📊 Stats after test:", stats_after)
    
    # Test de recherche
    search_results = manager.search_problems("python error", language="python")
    print(f"🔍 Search found {len(search_results)} problems")
    
    print("✅ Corpus Manager working correctly!")