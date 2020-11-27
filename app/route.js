const formValidator = require('./form_validator');
const photoModel = require('./photo_model');
const {PubSub} = require('@google-cloud/pubsub');
const {quickstart} = require('./pub_sub');
const moment = require('moment');
const env = require('../project-id-9307823999230114798-b3157dde6a00');
const {Storage} = require('@google-cloud/storage');

function route(app) {
    app.get('/', (req, res) => {
        const tags = req.query.tags;
        const tagmode = req.query.tagmode;

        const ejsLocalVariables = {
            tagsParameter: tags || '',
            tagmodeParameter: tagmode || '',
            photos: [],
            searchResults: false,
            invalidParameters: false
        };

        // if no input params are passed in then render the view with out querying the api
        if (!tags && !tagmode) {
            return res.render('index', ejsLocalVariables);
        }

        // validate query parameters
        if (!formValidator.hasValidFlickrAPIParams(tags, tagmode)) {
            ejsLocalVariables.invalidParameters = true;
            return res.render('index', ejsLocalVariables);
        }

        // get photos from flickr public feed api
        return photoModel
            .getFlickrPhotos(tags, tagmode)
            .then(photos => {
                ejsLocalVariables.photos = photos;
                ejsLocalVariables.searchResults = true;
                return res.render('index', ejsLocalVariables);
            })
            .catch(error => {
                return res.status(500).send({error});
            });
    });

    app.get('/zip', (req, res) => {
            const env = require('../project-id-9307823999230114798-b3157dde6a00');

            const tags = req.query.tags;
            const tagMode = req.query.tagmode;

            const ejsLocalVariables = {
                tagsParameter: tags || '',
                tagmodeParameter: tagMode || '',
                photos: [],
                searchResults: false,
                invalidParameters: false,
            };
            const credentials = {
                projectId: env.project_id,
                credentials: env
            };
            const pubsub = new PubSub(credentials);
            const topic = pubsub.topic('clement');
            topic.publish(Buffer.from(JSON.stringify({tags, tagMode})))

            return res.render('index', ejsLocalVariables);

        }
    );

    app.get('/get-zip', (req, res) => {

            async function getZip() {
                const options = {
                    action: 'read',
                    expires: moment().add(2, 'days').unix() * 1000
                };

                const credentials = {
                    projectId: env.project_id,
                    credentials: env
                };
                const storage = new Storage(credentials);

                const signedUrls = await storage.bucket('dmii2bucket').file('public/users/clement.zip').getSignedUrl(options);

                if (signedUrls) {
                    res.redirect(signedUrls);
                }
            }

            getZip()
        }
    );

}

module.exports = route;
