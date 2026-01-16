import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import B2 from 'backblaze-b2';

@Injectable()
export class B2Service {
    private b2: B2;
    constructor( private configService: ConfigService) {
        this.b2 = new B2({
            applicationKeyId: this.configService.get('b2.applicationKeyId'),
            applicationKey: this.configService.get('b2.applicationKey'),
        });
    }
    async uploadBuffer(buffer: Buffer, fileName: string, contentType: string) {
        await this.b2.authorize();
        const {data:uploadData}= await this.b2.getUploadUrl({
            bucketId: this.configService.get('b2.bucketId'),
        });
        const {data} = await this.b2.uploadFile({
            uploadUrl: uploadData.uploadUrl,
            uploadAuthToken: uploadData.authorizationToken,
            fileName: fileName,
            data: buffer,
            contentType: contentType,
        });
        return data;
    }

    async getDownloadUrl(fileName: string): Promise<string>{
        await this.b2.authorize();
        const {data} = await this.b2.getDownloadAuthorization({
            bucketId: this.configService.get('b2.bucketId'),
            fileNamePrefix: fileName,
            validDurationInSeconds: 3600,
        });
        const downloadUrl = this.configService.get('b2.downloadUrl');
        const bucketName = this.configService.get('b2.bucketName');
        return `${downloadUrl}/file/${bucketName}/${fileName}?Authorization=${data.authorizationToken}`;    
    }
}

