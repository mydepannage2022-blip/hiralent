declare module '@aws-sdk/client-s3' {
  // Minimal exports used by the project
  export class S3Client {
    constructor(config?: any);
    send(command: any): Promise<any>;
  }
  export class PutObjectCommand { constructor(args: any); }
  export class GetObjectCommand { constructor(args: any); }
  export class HeadObjectCommand { constructor(args: any); }
}

declare module '@aws-sdk/s3-request-presigner' {
  export function getSignedUrl(client: any, command: any, opts?: any): Promise<string>;
}

export {};
