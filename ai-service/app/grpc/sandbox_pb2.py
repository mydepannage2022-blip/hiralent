from google.protobuf import descriptor as _descriptor
from google.protobuf import descriptor_pool as _descriptor_pool
# We disable the strict protobuf runtime version check so the generated
# code can run with protobuf 5.x at runtime.
# from google.protobuf import runtime_version as _runtime_version
from google.protobuf import symbol_database as _symbol_database
from google.protobuf.internal import builder as _builder
# _runtime_version.ValidateProtobufRuntimeVersion(
#     _runtime_version.Domain.PUBLIC,
#     6,
#     31,
#     1,
#     '',
#     'sandbox.proto'
# )


_sym_db = _symbol_database.Default()




DESCRIPTOR = _descriptor_pool.Default().AddSerializedFile(b'\n\rsandbox.proto\x12\x07sandbox\"T\n\x0bTestRequest\x12\x0c\n\x04\x63ode\x18\x01 \x01(\t\x12%\n\ntest_cases\x18\x02 \x03(\x0b\x32\x11.sandbox.TestCase\x12\x10\n\x08language\x18\x03 \x01(\t\"E\n\x08TestCase\x12\r\n\x05input\x18\x01 \x01(\t\x12\x17\n\x0f\x65xpected_output\x18\x02 \x01(\t\x12\x11\n\tis_hidden\x18\x03 \x01(\x08\"3\n\nTestResult\x12\x0e\n\x06passed\x18\x01 \x01(\x08\x12\x15\n\rerror_message\x18\x02 \x01(\t\"e\n\x0cTestResponse\x12\x12\n\nall_passed\x18\x01 \x01(\x08\x12)\n\x0ctest_results\x18\x02 \x03(\x0b\x32\x13.sandbox.TestResult\x12\x16\n\x0e\x65xecution_time\x18\x03 \x01(\x02\x32I\n\x0eSandboxService\x12\x37\n\x08RunTests\x12\x14.sandbox.TestRequest\x1a\x15.sandbox.TestResponseb\x06proto3')

_globals = globals()
_builder.BuildMessageAndEnumDescriptors(DESCRIPTOR, _globals)
_builder.BuildTopDescriptorsAndMessages(DESCRIPTOR, 'sandbox_pb2', _globals)
if not _descriptor._USE_C_DESCRIPTORS:
  DESCRIPTOR._loaded_options = None
  _globals['_TESTREQUEST']._serialized_start=26
  _globals['_TESTREQUEST']._serialized_end=110
  _globals['_TESTCASE']._serialized_start=112
  _globals['_TESTCASE']._serialized_end=181
  _globals['_TESTRESULT']._serialized_start=183
  _globals['_TESTRESULT']._serialized_end=234
  _globals['_TESTRESPONSE']._serialized_start=236
  _globals['_TESTRESPONSE']._serialized_end=337
  _globals['_SANDBOXSERVICE']._serialized_start=339
  _globals['_SANDBOXSERVICE']._serialized_end=412
# @@protoc_insertion_point(module_scope)
