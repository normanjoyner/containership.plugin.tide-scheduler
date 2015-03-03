var _ = require("lodash");
var fs = require("fs");
var express = require("express");
var body_parser = require("body-parser");

function Server(core){
    this.core = core;
    this.server = express();
    this.middleware = require([__dirname, "middleware"].join("/")).initialize(core);
    this.routes = require([__dirname, "routes"].join("/"));
}

Server.prototype.listen = function(){
    this.server.use(body_parser.json());
    this.server.disable("x-powered-by");

    // set required pre-operation middleware
    this.server.use(this.middleware.init_response);
    this.server.use(this.middleware.redirect_to_controlling_leader);
    this.server.use(this.middleware.allow_cors);
    this.server.use(this.middleware.json_request);

    // register the routes
    this.routes.register(this.server, this.middleware);

    // set required post-operation middleware
    this.server.use(this.middleware.handle_response);

    // start listening
    this.listener = this.server.listen(9090, "0.0.0.0");
    this.core.loggers["tide-scheduler"].log("info", "Tide API is listening: http://0.0.0.0:9090");
}

Server.prototype.exit = function(){
    this.listener.close();
}

module.exports = Server;
