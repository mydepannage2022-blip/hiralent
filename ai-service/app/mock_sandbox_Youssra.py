# app/mock_sandbox_server.py
import time
from concurrent import futures

import grpc

from app.grpc import sandbox_pb2, sandbox_pb2_grpc


class MockSandboxService(sandbox_pb2_grpc.SandboxServiceServicer):
    """
    Mock du SandboxService.
    Ici on considère que tous les tests passent.
    """

    def RunTests(self, request, context):
        test_results = []
        for _tc in request.test_cases:
            test_results.append(
                sandbox_pb2.TestResult(
                    passed=True,
                    error_message=""
                )
            )

        response = sandbox_pb2.TestResponse(
            all_passed=True,
            test_results=test_results,
            execution_time=0.01,
        )
        return response


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))

    # ⚠️ Très important : vérifier le port de retour
    address = "127.0.0.1:50054"
    port = server.add_insecure_port(address)
    if port == 0:
        print(f"❌ Impossible de binder sur {address} (port déjà utilisé ? droits ?)")
        return

    sandbox_pb2_grpc.add_SandboxServiceServicer_to_server(
        MockSandboxService(), server
    )
    server.start()
    print(f"🚀 Mock Sandbox gRPC server listening on {address}")
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        print("🛑 Stopping mock sandbox server...")
        server.stop(0)


if __name__ == "__main__":
    serve()
