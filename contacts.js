const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const contactManager = require('./lib/contact_manager');
const helpers = require('./lib/helpers');

const app = express();

app.set('port', (process.env.PORT || 3000));

app.use('/', express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/api/contacts', async (req, res) => {
  const contacts = await contactManager.getAll()
  res.json(contacts);
});

app.get('/api/contacts/:id', async (req, res) => {
  let contact = await contactManager.get(req.params['id']);
  console.log(contact)
  if (contact) {
    res.json(contact);
  } else {
    res.status(404).end();
  }
});

app.post('/api/contacts', async (req, res) => {
  let contactAttrs = helpers.extractContactAttrs(req.body);
  let contact = await contactManager.add(contactAttrs);
  if (contact) {
    res.status(201).json(contact);
  } else {
    res.status(400).end();
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  let contactAttrs = helpers.extractContactAttrs(req.body);
  let contact = await contactManager.update(req.params['id'], contactAttrs);
  if (contact) {
    res.status(201).json(contact);
  } else {
    res.status(400).end();
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  if (await contactManager.remove(req.params['id'])) {
    res.status(204).end();
  } else {
    res.status(400).end();
  }
});

app.listen(app.get('port'), () => {
  console.log(`Find the server at: http://localhost:${app.get('port')}/`); // eslint-disable-line no-console
});

module.exports = app; // for testing
