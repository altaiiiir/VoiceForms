// express server on port 8080
//
const express = require("express");
const app = express();
const path = require("path");
const {PinataSDK} = require("pinata");


const pinata = new PinataSDK({
    pinataJwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzYjE4ZWYxYS1hNThiLTQyODYtYmExMy1jODk1MDFmZDk1NWQiLCJlbWFpbCI6ImphbWVzLmJ5YXJzQHNwcmluZ3ZlbnR1cmVncm91cC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiZmUzMDNkZmVjYWE1MGVkZGE5MTgiLCJzY29wZWRLZXlTZWNyZXQiOiJkOWNkMjhiZDdlOTBlMzA5Mzk4YjgxM2ZkMzdhOWZmNGVjYjg2NzRiNzRhOTU5ZGEwYzc4ZGIyNDNhNWI2OWRkIiwiZXhwIjoxNzU5MDcwNzAyfQ.9x3_QVMDGKv5LaQovVR1PdK4Sdsy8Rw_eXEWENh6BRQ",
    pinataGateway: "amber-kind-cuckoo-112.mypinata.cloud",
});
app.get("/content/:cid", async (req, res) => {
    const {cid} = req.params;

    const retrievedFile = await pinata.gateways.get(cid);
    const blob = new Blob([retrievedFile.data], {type: 'text/plain'});

    let text = await blob.text();
    console.log(text);
    return res.status(200)
        .set('Content-Type', 'text/plain')
        .set('Access-Control-Allow-Origin', '*')
        .send(text);
});
app.listen(8080, () => {
    console.log("Server is running on http://localhost:8080");
});
