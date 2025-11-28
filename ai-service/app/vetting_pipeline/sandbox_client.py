# vetting_pipeline/sandbox_client.py
import grpc
from typing import Dict
import logging
from grpc._channel import _InactiveRpcError

# Import generated gRPC code
from ..grpc import sandbox_pb2, sandbox_pb2_grpc

class SandboxClient:
    def __init__(self, sandbox_service_url: str):
        self.sandbox_service_url = sandbox_service_url
        self.logger = logging.getLogger(__name__)
        self.channel = None
        self.stub = None
    
    def _ensure_connection(self):
        """Ensure gRPC connection is established"""
        if self.channel is None or self.stub is None:
            self.channel = grpc.insecure_channel(self.sandbox_service_url)
            self.stub = sandbox_pb2_grpc.SandboxServiceStub(self.channel)
    
    def validate_solution(self, question: Dict) -> Dict:
        """Send canonical solution to sandbox for validation"""
        self._ensure_connection()
        
        try:
            # Prepare test request
            test_request = sandbox_pb2.TestRequest(
                code=question['canonical_solution'],
                test_cases=[
                    sandbox_pb2.TestCase(
                        input=tc['input'],
                        expected_output=tc['expected_output'],
                        is_hidden=tc.get('is_hidden', False)
                    ) for tc in question['test_cases']
                ],
                language=question['language']
            )
            
            # Call sandbox service
            response = self.stub.RunTests(test_request, timeout=30)
            
            return {
                'all_passed': response.all_passed,
                'test_results': [
                    {
                        'passed': tr.passed,
                        'error_message': tr.error_message
                    } for tr in response.test_results
                ],
                'execution_time': response.execution_time
            }
            
        except _InactiveRpcError as e:
            self.logger.error(f"gRPC call failed: {e}")
            return {
                'all_passed': False,
                'test_results': [],
                'error': str(e)
            }
    
    def close(self):
        """Close gRPC connection"""
        if self.channel:
            self.channel.close()