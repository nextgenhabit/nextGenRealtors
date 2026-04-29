/* =========================================================
   DATA.JS — Firebase Firestore CRUD helpers & seed data
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyDZws6SHNJMsudfXf53dRQAfpViBNm5V9s",
  authDomain: "nextgenrealtors-e3e3c.firebaseapp.com",
  projectId: "nextgenrealtors-e3e3c",
  storageBucket: "nextgenrealtors-e3e3c.firebasestorage.app",
  messagingSenderId: "466433202518",
  appId: "1:466433202518:web:44b8092ab75beab0a05ef7",
  measurementId: "G-ETGMKX78XX",
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const KEYS = {
  plots: "plots",
  flats: "flats",
  apartments: "apartments",
  villas: "villas",
  commercial: "commercial",
  miniposts: "miniposts",
  clients: "clients",
  reviews: "reviews",
  subscribers: "subscribers",
  contact: "contact",
  about: "about",
  settings: "settings",
  mp_areas: "mp_areas",
};

// ---- Cache Layer for Performance ----
const _dbCache = {
  plots: null,
  flats: null,
  apartments: null,
  villas: null,
  commercial: null,
  miniposts: null,
  clients: null,
  reviews: null,
  subscribers: null,
  contact: null,
  about: null,
  settings: null,
  mp_areas: null,
};

// ---- Generic helpers ----
async function getData(collection) {
  if (_dbCache[collection]) {
    // Return a deep copy to prevent frontend mutations from altering the cache
    return JSON.parse(JSON.stringify(_dbCache[collection]));
  }

  try {
    const snapshot = await db
      .collection(collection)
      .orderBy("createdAt", "desc")
      .get();

    const results = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    _dbCache[collection] = results; // Set cache
    // Return a deep copy so initial render doesn't mutate cache either
    return JSON.parse(JSON.stringify(results));
  } catch (error) {
    console.error(`Error getting documents from ${collection}: `, error);
    return [];
  }
}

function clearCache(collection) {
  _dbCache[collection] = null;
}

async function addItem(collection, item) {
  try {
    item.createdAt = new Date().toISOString();

    // Assign a sequential numerical ID (propId) for properties (plots, flats, villas, commercial, apartments)
    if (["plots", "flats", "apartments", "villas", "commercial", "miniposts"].includes(collection)) {
      const snapshot = await db
        .collection(collection)
        .orderBy("propId", "desc")
        .limit(1)
        .get();
      if (!snapshot.empty) {
        const lastDoc = snapshot.docs[0].data();
        item.propId = (lastDoc.propId || 0) + 1;
      } else {
        item.propId = 1;
      }
    }

    const docRef = await db.collection(collection).add(item);
    clearCache(collection); // Invalidate cache
    return { id: docRef.id, ...item };
  } catch (error) {
    console.error("Error adding document: ", error);
    throw error;
  }
}

async function updateItem(collection, id, updates) {
  try {
    updates.updatedAt = new Date().toISOString();
    await db.collection(collection).doc(id).update(updates);
    clearCache(collection); // Invalidate cache
  } catch (error) {
    console.error("Error updating document: ", error);
    throw error;
  }
}

async function deleteItem(collection, id) {
  try {
    await db.collection(collection).doc(id).delete();
    clearCache(collection); // Invalidate cache
  } catch (error) {
    console.error("Error deleting document: ", error);
    throw error;
  }
}

// Old localStorage helpers have been removed.

// ---- Typed accessors ----
const DB = {
  plots: {
    get: () => getData(KEYS.plots),
    add: (d) => addItem(KEYS.plots, d),
    update: (id, d) => updateItem(KEYS.plots, id, d),
    del: (id) => deleteItem(KEYS.plots, id),
  },
  flats: {
    get: () => getData(KEYS.flats),
    add: (d) => addItem(KEYS.flats, d),
    update: (id, d) => updateItem(KEYS.flats, id, d),
    del: (id) => deleteItem(KEYS.flats, id),
  },
  apartments: {
    get: () => getData(KEYS.apartments),
    add: (d) => addItem(KEYS.apartments, d),
    update: (id, d) => updateItem(KEYS.apartments, id, d),
    del: (id) => deleteItem(KEYS.apartments, id),
  },
  villas: {
    get: () => getData(KEYS.villas),
    add: (d) => addItem(KEYS.villas, d),
    update: (id, d) => updateItem(KEYS.villas, id, d),
    del: (id) => deleteItem(KEYS.villas, id),
  },
  commercial: {
    get: () => getData(KEYS.commercial),
    add: (d) => addItem(KEYS.commercial, d),
    update: (id, d) => updateItem(KEYS.commercial, id, d),
    del: (id) => deleteItem(KEYS.commercial, id),
  },
  miniposts: {
    get: () => getData(KEYS.miniposts),
    add: (d) => addItem(KEYS.miniposts, d),
    update: (id, d) => updateItem(KEYS.miniposts, id, d),
    del: (id) => deleteItem(KEYS.miniposts, id),
  },
  clients: {
    get: () => getData(KEYS.clients),
    add: (d) => addItem(KEYS.clients, d),
    update: (id, d) => updateItem(KEYS.clients, id, d),
    del: (id) => deleteItem(KEYS.clients, id),
  },
  reviews: {
    get: () => getData(KEYS.reviews),
    add: (d) => addItem(KEYS.reviews, d),
    update: (id, d) => updateItem(KEYS.reviews, id, d),
    del: (id) => deleteItem(KEYS.reviews, id),
  },
  subscribers: {
    get: () => getData(KEYS.subscribers),
    add: (d) => addItem(KEYS.subscribers, d),
    del: (id) => deleteItem(KEYS.subscribers, id),
  },
  contact: {
    get: () => getData(KEYS.contact),
    add: (d) => addItem(KEYS.contact, d),
    update: (id, d) => updateItem(KEYS.contact, id, d),
  },
  about: {
    get: () => getData(KEYS.about),
    add: (d) => addItem(KEYS.about, d),
    update: (id, d) => updateItem(KEYS.about, id, d),
  },
  settings: {
    get: () => getData(KEYS.settings),
    add: (d) => addItem(KEYS.settings, d),
    update: (id, d) => updateItem(KEYS.settings, id, d),
  },
  users: {
    get: () => getData('users'),
    add: (d) => addItem('users', d),
    update: (id, d) => updateItem('users', id, d),
  },
  mp_areas: {
    get: () => getData(KEYS.mp_areas),
    add: (d) => addItem(KEYS.mp_areas, d),
    del: (id) => deleteItem(KEYS.mp_areas, id),
  },
};

// Seed data function removed, as Firebase is persistent without localStorage reset loops!
