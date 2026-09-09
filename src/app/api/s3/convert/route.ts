import { NextResponse } from 'next/server';
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';

export async function POST(req: Request) {
  try {
    const { s3Url, filename } = await req.json();

    if (!s3Url) {
      return NextResponse.json({ error: 's3Url is required' }, { status: 400 });
    }

    const bucketName = process.env.AWS_BUCKET_NAME || 'brillinat-academy-1';
    const region = process.env.AWS_REGION || 'eu-north-1';
    
    // Parse the S3 key from the public URL
    // e.g., https://brillinat-academy-1.s3.eu-north-1.amazonaws.com/course-videos/1234_vid.mp4
    const keyMatch = s3Url.split('.amazonaws.com/');
    if (keyMatch.length < 2) {
      return NextResponse.json({ error: 'Invalid S3 URL format' }, { status: 400 });
    }
    const inputKey = keyMatch[1];
    const s3InputPath = `s3://${bucketName}/${inputKey}`;
    
    // Output path: s3://brillinat-academy-1/hls-videos/1234_vid/
    const baseName = inputKey.split('/').pop()?.split('.')[0] || Date.now().toString();
    const s3OutputPath = `s3://${bucketName}/hls-videos/${baseName}/`;
    
    // The final HLS URL to return to the frontend
    const finalHlsUrl = `https://${bucketName}.s3.${region}.amazonaws.com/hls-videos/${baseName}/master.m3u8`;

    // Make sure they have configured these in .env.local!
    const endpoint = process.env.AWS_MEDIACONVERT_ENDPOINT;
    const roleArn = process.env.AWS_MEDIACONVERT_ROLE_ARN;

    if (!endpoint || !roleArn) {
      return NextResponse.json({ 
        error: 'MediaConvert is not fully configured on the server yet. Missing endpoint or role ARN.',
        finalHlsUrl // We still return it in case they want to bypass during testing
      }, { status: 500 });
    }

    const mediaconvert = new MediaConvertClient({
      region,
      endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      }
    });

    const jobParams = {
      Role: roleArn,
      Settings: {
        Inputs: [
          {
            FileInput: s3InputPath,
            AudioSelectors: {
              "Audio Selector 1": {
                DefaultSelection: "DEFAULT"
              }
            },
            VideoSelector: {}
          }
        ],
        OutputGroups: [
          {
            Name: "Apple HLS",
            OutputGroupSettings: {
              Type: "HLS_GROUP_SETTINGS",
              HlsGroupSettings: {
                SegmentLength: 6,
                MinSegmentLength: 0,
                Destination: s3OutputPath
              }
            },
            Outputs: [
              {
                NameModifier: "_1080p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      MaxBitrate: 5000000,
                      RateControlMode: "QVBR",
                      QvbrSettings: { QvbrQualityLevel: 8 }
                    }
                  },
                  Height: 1080,
                  Width: 1920
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: { Bitrate: 128000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 }
                    }
                  }
                ],
                ContainerSettings: { Container: "M3U8" }
              },
              {
                NameModifier: "_720p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      MaxBitrate: 3000000,
                      RateControlMode: "QVBR",
                      QvbrSettings: { QvbrQualityLevel: 7 }
                    }
                  },
                  Height: 720,
                  Width: 1280
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: { Bitrate: 96000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 }
                    }
                  }
                ],
                ContainerSettings: { Container: "M3U8" }
              },
              {
                NameModifier: "_480p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      MaxBitrate: 1500000,
                      RateControlMode: "QVBR",
                      QvbrSettings: { QvbrQualityLevel: 7 }
                    }
                  },
                  Height: 480,
                  Width: 854
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: { Bitrate: 96000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 }
                    }
                  }
                ],
                ContainerSettings: { Container: "M3U8" }
              },
              {
                NameModifier: "_144p",
                VideoDescription: {
                  CodecSettings: {
                    Codec: "H_264",
                    H264Settings: {
                      MaxBitrate: 400000,
                      RateControlMode: "QVBR",
                      QvbrSettings: { QvbrQualityLevel: 6 }
                    }
                  },
                  Height: 144,
                  Width: 256
                },
                AudioDescriptions: [
                  {
                    CodecSettings: {
                      Codec: "AAC",
                      AacSettings: { Bitrate: 64000, CodingMode: "CODING_MODE_2_0", SampleRate: 48000 }
                    }
                  }
                ],
                ContainerSettings: { Container: "M3U8" }
              }
            ]
          }
        ]
      }
    };

    // @ts-ignore
    const data = await mediaconvert.send(new CreateJobCommand(jobParams));

    return NextResponse.json({
      message: 'MediaConvert job created successfully',
      jobId: data.Job?.Id,
      finalHlsUrl
    });

  } catch (error: any) {
    console.error('MediaConvert error:', error);
    return NextResponse.json({ error: error.message || 'Failed to start MediaConvert job' }, { status: 500 });
  }
}
