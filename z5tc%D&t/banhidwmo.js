const express = require('express');
const mongoose = require('mongoose');
const geoip = require('geoip-lite');
const bodyParser = require('body-parser');
const app = express();

mongoose.connect('mongodb://localhost:27017/websiteDB', { useNewUrlParser: true, useUnifiedTopology: true });

const visitorSchema = new mongoose.Schema({
    ip: String,
    location: String,
    accessTime: Date,
    duration: Number
});

const Visitor = mongoose.model('Visitor', visitorSchema);

app.use(bodyParser.json());

app.use((req, res, next) => {
    const ip = req.ip;
    const geo = geoip.lookup(ip);
    const visitor = new Visitor({
        ip: ip,
        location: geo ? geo.city : 'unknown',
        accessTime: new Date(),
        duration: 0 // This should be updated when the session ends
    });

    visitor.save().then(() => next());
});

app.post('/update-duration', (req, res) => {
    const { ip } = req;
    const { duration } = req.body;

    Visitor.findOneAndUpdate({ ip, duration: 0 }, { duration })
        .then(() => res.sendStatus(200))
        .catch(err => res.sendStatus(500));
});

app.get('/visitor-data', (req, res) => {
    Visitor.aggregate([
        {
            $group: {
                _id: { $hour: "$accessTime" },
                count: { $sum: 1 }
            }
        }
    ]).then(result => {
        res.json({
            timestamps: result.map(r => r._id),
            counts: result.map(r => r.count)
        });
    });
});

app.listen(3000, () => console.log('Server running on port 3000'));
