# talent-ai-service/matching-candidate-job/app/cleanup_orphaned_vectors.py
"""
Script to clean up orphaned vectors in Qdrant
- Removes jobs that exist in Qdrant but not in PostgreSQL
- Removes candidates that exist in Qdrant but not in PostgreSQL
"""

import os
import requests
from qdrant_client import QdrantClient
from typing import Set, List
import sys

# ===========================
# CONFIGURATION (env-driven, R-13)
# ===========================
# These were previously hardcoded literals (incl. a "changeme" token baked into the file),
# so the script could not be pointed at staging/prod and shipped a placeholder secret.
# Resolve from env; the token has NO default — the script must be given a real one.
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:5000")
BACKEND_TOKEN = os.getenv("BACKEND_INTERNAL_TOKEN", "")

if not BACKEND_TOKEN:
    print("ERROR: BACKEND_INTERNAL_TOKEN is not set — refusing to call the backend without it.")
    sys.exit(1)

JOBS_COLLECTION = "jobs"
CANDIDATES_COLLECTION = "candidates"

# ===========================
# HELPER FUNCTIONS
# ===========================

def get_headers():
    """Return authorization headers for backend API"""
    return {
        "Authorization": f"Bearer {BACKEND_TOKEN}",
        "Content-Type": "application/json"
    }


def check_job_exists(job_id: str) -> bool:
    """Check if a job exists in the database via backend API"""
    try:
        url = f"{BACKEND_URL}/internal/matching/company/jobs/{job_id}/snapshot"
        r = requests.get(url, headers=get_headers(), timeout=5)
        return r.status_code == 200
    except Exception as e:
        print(f"⚠️ Error checking job {job_id}: {e}")
        return False


def check_candidate_exists(candidate_id: str) -> bool:
    """Check if a candidate exists in the database via backend API"""
    try:
        url = f"{BACKEND_URL}/internal/matching/candidate/candidates/{candidate_id}/snapshot"
        r = requests.get(url, headers=get_headers(), timeout=5)
        return r.status_code == 200
    except Exception as e:
        print(f"⚠️ Error checking candidate {candidate_id}: {e}")
        return False


def get_all_points_from_collection(client: QdrantClient, collection_name: str) -> List[str]:
    """Get all point IDs from a Qdrant collection"""
    try:
        scroll_result = client.scroll(
            collection_name=collection_name,
            limit=10000,  # Adjust if you have more points
            with_payload=False,
            with_vectors=False
        )
        
        points = scroll_result[0]
        point_ids = [str(point.id) for point in points]
        
        return point_ids
    except Exception as e:
        print(f"❌ Error fetching points from {collection_name}: {e}")
        return []


def cleanup_orphaned_jobs(client: QdrantClient, dry_run: bool = True):
    """Find and optionally delete orphaned jobs from Qdrant"""
    print("\n" + "="*60)
    print("🔍 CHECKING ORPHANED JOBS")
    print("="*60)
    
    job_ids = get_all_points_from_collection(client, JOBS_COLLECTION)
    
    if not job_ids:
        print("⚠️ No jobs found in Qdrant")
        return
    
    print(f"📊 Total jobs in Qdrant: {len(job_ids)}")
    
    orphaned_jobs = []
    valid_jobs = []
    
    print("\n🔎 Checking each job in database...")
    for i, job_id in enumerate(job_ids, 1):
        exists = check_job_exists(job_id)
        
        if exists:
            valid_jobs.append(job_id)
            print(f"  [{i}/{len(job_ids)}] ✅ {job_id[:8]}... exists in DB")
        else:
            orphaned_jobs.append(job_id)
            print(f"  [{i}/{len(job_ids)}] ❌ {job_id[:8]}... NOT in DB (orphaned)")
    
    print(f"\n📊 Results:")
    print(f"  ✅ Valid jobs: {len(valid_jobs)}")
    print(f"  ❌ Orphaned jobs: {len(orphaned_jobs)}")
    
    if orphaned_jobs:
        print(f"\n🗑️ Orphaned job IDs:")
        for job_id in orphaned_jobs:
            print(f"  - {job_id}")
        
        if not dry_run:
            confirm = input(f"\n⚠️ DELETE {len(orphaned_jobs)} orphaned jobs from Qdrant? (yes/no): ")
            if confirm.lower() == 'yes':
                try:
                    client.delete(
                        collection_name=JOBS_COLLECTION,
                        points_selector=orphaned_jobs
                    )
                    print(f"✅ Successfully deleted {len(orphaned_jobs)} orphaned jobs from Qdrant")
                except Exception as e:
                    print(f"❌ Error deleting jobs: {e}")
            else:
                print("❌ Deletion cancelled")
        else:
            print("\n💡 This is a DRY RUN - no changes made. Run with --execute to delete.")
    else:
        print("\n✅ No orphaned jobs found!")


def cleanup_orphaned_candidates(client: QdrantClient, dry_run: bool = True):
    """Find and optionally delete orphaned candidates from Qdrant"""
    print("\n" + "="*60)
    print("🔍 CHECKING ORPHANED CANDIDATES")
    print("="*60)
    
    candidate_ids = get_all_points_from_collection(client, CANDIDATES_COLLECTION)
    
    if not candidate_ids:
        print("⚠️ No candidates found in Qdrant")
        return
    
    print(f"📊 Total candidates in Qdrant: {len(candidate_ids)}")
    
    orphaned_candidates = []
    valid_candidates = []
    
    print("\n🔎 Checking each candidate in database...")
    for i, candidate_id in enumerate(candidate_ids, 1):
        exists = check_candidate_exists(candidate_id)
        
        if exists:
            valid_candidates.append(candidate_id)
            print(f"  [{i}/{len(candidate_ids)}] ✅ {candidate_id[:8]}... exists in DB")
        else:
            orphaned_candidates.append(candidate_id)
            print(f"  [{i}/{len(candidate_ids)}] ❌ {candidate_id[:8]}... NOT in DB (orphaned)")
    
    print(f"\n📊 Results:")
    print(f"  ✅ Valid candidates: {len(valid_candidates)}")
    print(f"  ❌ Orphaned candidates: {len(orphaned_candidates)}")
    
    if orphaned_candidates:
        print(f"\n🗑️ Orphaned candidate IDs:")
        for candidate_id in orphaned_candidates:
            print(f"  - {candidate_id}")
        
        if not dry_run:
            confirm = input(f"\n⚠️ DELETE {len(orphaned_candidates)} orphaned candidates from Qdrant? (yes/no): ")
            if confirm.lower() == 'yes':
                try:
                    client.delete(
                        collection_name=CANDIDATES_COLLECTION,
                        points_selector=orphaned_candidates
                    )
                    print(f"✅ Successfully deleted {len(orphaned_candidates)} orphaned candidates from Qdrant")
                except Exception as e:
                    print(f"❌ Error deleting candidates: {e}")
            else:
                print("❌ Deletion cancelled")
        else:
            print("\n💡 This is a DRY RUN - no changes made. Run with --execute to delete.")
    else:
        print("\n✅ No orphaned candidates found!")


# ===========================
# MAIN SCRIPT
# ===========================

def main():
    """Main cleanup function"""
    print("\n" + "="*60)
    print("🧹 QDRANT ORPHANED VECTORS CLEANUP TOOL")
    print("="*60)
    print(f"Qdrant: {QDRANT_URL}")
    print(f"Backend: {BACKEND_URL}")
    
    # Check if --execute flag is present
    dry_run = "--execute" not in sys.argv
    
    if dry_run:
        print("\n💡 DRY RUN MODE - No changes will be made")
        print("   Run with --execute to actually delete orphaned vectors")
    else:
        print("\n⚠️ EXECUTE MODE - Orphaned vectors WILL BE DELETED")
    
    # Initialize Qdrant client
    try:
        client = QdrantClient(url=QDRANT_URL)
        
        # Test connection
        collections = client.get_collections()
        print(f"\n✅ Connected to Qdrant - {len(collections.collections)} collections found")
        
    except Exception as e:
        print(f"\n❌ Failed to connect to Qdrant: {e}")
        print("Make sure Qdrant is running at", QDRANT_URL)
        return
    
    # Test backend connection
    try:
        r = requests.get(f"{BACKEND_URL}/api/v1/", timeout=5)
        print(f"✅ Backend is reachable at {BACKEND_URL}")
    except Exception as e:
        print(f"\n❌ Failed to connect to backend: {e}")
        print("Make sure the Node.js backend is running at", BACKEND_URL)
        return
    
    # Run cleanup for both jobs and candidates
    cleanup_orphaned_jobs(client, dry_run=dry_run)
    cleanup_orphaned_candidates(client, dry_run=dry_run)
    
    print("\n" + "="*60)
    print("✅ CLEANUP COMPLETE")
    print("="*60)


if __name__ == "__main__":
    main()