const express = require('express')
router = express.Router();
const db= require('../models/db');
const { query } = require('express');

router.get('/', (req, res) => {
    //res.send('Api UP')
    dbTickets = db.getInstance();
    dbTickets.collection("tickets").find()
        .toArray(function (err, items) {
            res.send(items);
        });
})


module.exports = router;