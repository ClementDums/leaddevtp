// Imports the Google Cloud client library
const {PubSub} = require('@google-cloud/pubsub');
const photoModel = require('./photo_model');
const ZipStream = require('zip-stream');
const request = require('request');

async function quickstart(
    projectId = 'project-id-9307823999230114798', // Your Google Cloud Platform project ID
    topicName = 'clement', // Name for the new topic to create
    subscriptionName = 'clement' // Name for the new subscription to create
) {
    const {Storage} = require('@google-cloud/storage');
    const env = require('../project-id-9307823999230114798-b3157dde6a00');
    const credentials = {
        projectId: env.project_id,
        credentials: env
    };
    const pubsub = new PubSub(credentials);
    // Creates a new topic
    const topic = await pubsub.topic(topicName);
    console.log(`Topic ${topic.name} created.`);

    const subscription = await topic.subscription(topicName);

    // Receive callbacks for new messages on the subscription
    subscription.on('message', message => {
        console.log('Received message:', message.data.toString());
    });

    // Receive callbacks for errors on the subscription
    subscription.on('error', error => {
        console.error('Received error:', error);
    });


    function listenForMessages() {
        const timeout = 60;

        // References an existing subscription
        const subscription = pubsub.subscription(topicName);

        // Create an event handler to handle messages
        let messageCount = 0;
        const messageHandler = async message => {
            const data = JSON.parse(message.data);
                var zip = new ZipStream();
                console.log(`Received message ${message.id}:`);
                console.log(`\tData: ${message.data}`);
                console.log(`\tAttributes: ${message.attributes}`);
                messageCount += 1;
                let storage = new Storage(credentials);


                const file = await storage.bucket('dmii2bucket').file('public/users/clement.zip');
                const stream = file.createWriteStream({
                    metadata: {
                        contentType: 'application/zip',
                        cacheControl: 'private'
                    },
                    resumable: false
                });

                zip.pipe(stream);


                let arrayPhoto = [];

                await photoModel.getFlickrPhotos(data.tags, data.tagMode)
                    .then(photos => {
                        for (let i = 0; i < 10; i++) {
                            arrayPhoto.push({name: photos[i].title + '.jpg', url: photos[i].media.b});
                        }

                        function addNextFile() {
                            var elem = arrayPhoto.shift();
                            var stream = request(elem.url);

                            zip.entry(stream, {name: elem.name}, err => {
                                if (err)
                                    throw err;
                                if (arrayPhoto.length > 0)
                                    addNextFile();
                                else
                                    zip.finalize()
                            })
                        }

                        addNextFile();
                    });

                await new Promise((resolve, reject) => {
                    stream.on('error', (err) => {
                        reject(err);
                    });
                    stream.on('finish', () => {
                        resolve('Ok');
                    });
                });
                message.ack();
            }
        ;

        // Listen for new messages until timeout is hit
        subscription.on('message', messageHandler);

        setTimeout(() => {
            subscription.removeListener('message', messageHandler);
            console.log(`${messageCount} message(s) received.`);
        }, timeout * 1000);

    }

    listenForMessages();
}

quickstart();

