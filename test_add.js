const data = {
    title: "Test Plot",
    location: "Test Location",
    district: null,
    village: null,
    contactNumber: null,
    mapUrl: null,
    price: "1000",
    status: "Available",
    description: null,
    videoUrl: null,
    images: [],
    imageUrl: '',
    area: null,
    facing: null,
    approvedBy: null,
    lpNumber: null,
    reraApproved: 'Yes'
};

// Check for undefined values
const undefinedKeys = Object.keys(data).filter(k => data[k] === undefined);
console.log("Undefined keys:", undefinedKeys);

// Test null stripping
const stripUndefined = (obj) => {
    Object.keys(obj).forEach(key => obj[key] === undefined && delete obj[key]);
    return obj;
};

// Also test Firestore initialization and offline usage. No we can't do this easily since data.js uses browser firebase SDK.
console.log("Stripped data:", stripUndefined(data));
