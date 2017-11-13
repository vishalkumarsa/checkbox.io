http = require('http');
httpProxy = require('http-proxy');
const isReachable = require('is-reachable');
var express = require('express');
var sioc = require('socket.io-client');
var os = require('os');

var interfaces = os.networkInterfaces();

var proxy = httpProxy.createProxyServer({});

var canary_status = false;
var reach = false;
var i = 0;
var count=1;

var prodServer = "67.205.162.15";
var canaryServer = "159.203.100.176";

var socket = sioc('http://' + canaryServer);


var server = http.createServer(function(req, res) {

    var port = 3000;

    var tar = "http://" + prodServer;
    
    	 
    if (count%5 == 0 ) {
    
      	port = 3000;
	isReachable('159.203.100.176').then(reachable => {
        //console.log(reachable);
        if(reachable == true){
        reach = true;
        //console.log("reach: "+reach);
	tar = "http://" + canaryServer;
	if (count%5 == 0)
	{
        console.log("Forwarding re-routed to Canary server - " + canaryServer);
	//console.log("Count: "+ count);
	}
        count+=1;

        }
        else{
        target = "http://" + prodServer;
        console.log("Request sent to Production Server - " + prodServer + " as alert obtained notifying canary is down");
        count++;	
	}
        
        });
        

    }  
	else {
        target = "http://" + prodServer; 
        console.log("Request sent to Production Server - " + prodServer);
	count++;
    
    }

    proxy.web(req, res, {
        target: tar
    });

});

console.log("listening on port 5000")
server.listen(5000);
