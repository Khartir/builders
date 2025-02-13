import { BuilderOptions } from '@pika/types';
export declare function beforeJob({ out }: BuilderOptions): Promise<void>;
export declare function manifest(manifest: any): void;
export declare function build({ out, options, reporter }: BuilderOptions): Promise<void>;
