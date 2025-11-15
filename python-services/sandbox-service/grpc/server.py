"""gRPC server stub for sandbox service."""
import grpc
from concurrent import futures
import time

# Import generated stubs when compiled. For now the proto is present as sandbox.proto


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    # TODO: import and add the generated servicer class
    server.add_insecure_port('[::]:50054')
    server.start()
    try:
        while True:
            time.sleep(86400)
    except KeyboardInterrupt:
        server.stop(0)


if __name__ == '__main__':
    serve()
