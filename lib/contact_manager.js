require('dotenv').config();
const { Client } = require('pg');
const client = new Client();

const CONTACTS_QUERY = `
  SELECT
    contact.id AS id,
    full_name,
    phone_number,
    email,
    STRING_AGG(tags.category, ',') AS tags 
  FROM contact
  LEFT JOIN contact_tags ON contact.id = contact_tags.contact_id
  LEFT JOIN tags ON contact_tags.tag_id = tags.id
  GROUP BY contact.id`;

const SINGLE_CONTACT_QUERY = `
  SELECT
    contact.id AS id,
    full_name,
    phone_number,
    email,
    STRING_AGG(tags.category, ',') AS tags 
  FROM contact
  LEFT JOIN contact_tags ON contact.id = contact_tags.contact_id
  LEFT JOIN tags ON contact_tags.tag_id = tags.id
  WHERE contact.id=$1
  GROUP BY contact.id`;

const NEW_CONTACT_QUERY = `
  INSERT INTO contact(full_name, phone_number, email)
    VALUES($1, $2, $3) RETURNING *`;

const contactManager = {
  getAll: async function() {
    const { rows } = await client.query(CONTACTS_QUERY)

    return rows;
  },

  get: async function(contactId) {
    const response = await client.query(SINGLE_CONTACT_QUERY, [contactId])

    if (response.rowCount === 0) {
      return false
    } else {
      return response.rows[0]
    }
  },

  add: async function({ full_name, phone_number, email, tags }) {
    full_name = full_name.trim()
    if (!full_name) return false;
    phone_number = phone_number || ''
    email = email || ''

    const response = await client.query(NEW_CONTACT_QUERY, [full_name, phone_number, email])
    let newContact = response.rows[0]

    if (tags && tags.length > 0) {
      const tagNames = tags.split(',')
      const { rows: dbTags } = await client.query(`SELECT * FROM tags`)
      let tagIds = []
      console.log("Tags from db: ", dbTags)

      for (const tagName of tagNames) {
        let found = false

        for (const dbTag of dbTags) {
          if (dbTag.category === tagName) {
            tagIds.push(dbTag.id)
            found = true
            break
          }
        }

        if (!found) {
          const { rows } = await client.query('INSERT INTO tags(category) VALUES ($1) RETURNING *', [tagName])
          tagIds.push(rows[0].id)
        }
      }
      console.log("Tags ids to add for contact: ", tagIds)

      const promises = []

      for (const tagId of tagIds) {
        promises.push(client.query('INSERT INTO contact_tags(contact_id, tag_id) VALUES ($1, $2)', [newContact.id, tagId]))
      }

      await Promise.all(promises)
      const { rows } = await client.query(SINGLE_CONTACT_QUERY, [newContact.id])
      newContact = rows[0]
    }

    console.log(newContact)
    
    return newContact;
  },

  remove: async function(contactId) {
    const { rowCount } = await client.query('DELETE FROM contact WHERE id=$1', [contactId])
    return rowCount === 1
  },

  update: async function(contactId, contactAttrs) {
    delete contactAttrs.tags

    const setClause = Object.keys(contactAttrs).map(attr => {
      return `${attr} = '${contactAttrs[attr]}'`
    }).join(', ')

    const query = `UPDATE contact SET ${setClause} WHERE id=${contactId} RETURNING *`
    console.log("Query: ", query)
    const response = await client.query(query)

    if (response.rowCount == 0) {
      return false
    } else {
      return response.rows[0]
    }
  },
};

(async function connect() {
  await client.connect()
  console.log('Connected to Postgres')
})()

module.exports = contactManager;
