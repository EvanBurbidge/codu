const sharp = require("sharp");
const {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const s3 = new S3Client();

const createTargetKey = (str) => {
  return str.replace(/u\//, "new/");
};

exports.handler = async (event) => {
  console.log(JSON.stringify(event, null, 2));
  const bucket = event.Records[0].s3.bucket.name;
  const key = event.Records[0].s3.object.key;
  const targetKey = createTargetKey(key);

  const params = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const response = await s3.send(new GetObjectCommand(params));
    const stream = response.Body;

    if (!stream) throw new Error("BodyStream is empty");

    const resizedImage = await sharp(Buffer.concat(await stream.toArray()))
      .resize({ width: 200, height: 200, fit: "fill" })
      .webp({ quality: 80 })
      .toBuffer()
      .catch((err) => {
        console.log("SHARP ERROR", err);
      });

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: targetKey,
        Body: resizedImage,
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Image resized successfully!" }),
    };
  } catch (error) {
    console.error("Error processing image:", error);
    throw new Error("Error processing image");
  }
};