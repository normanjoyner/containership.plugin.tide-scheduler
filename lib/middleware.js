var fs = require("fs");
var _ = require("lodash");
var tide_scheduler = require([__dirname, "tide-scheduler"].join("/"));

module.exports = {

    initialize: function(core){
        var handlers = {};
        var available_versions = fs.readdirSync([__dirname, "..", "handlers"].join("/"));
        _.each(available_versions, function(version){
            handlers[version] = {};
            var available_handlers = fs.readdirSync([__dirname, "..", "handlers", version].join("/"));
            _.each(available_handlers, function(handler){
                var handler_name = handler.split(".")[0];
                handlers[version][handler_name] = require([__dirname, "..", "handlers", version, handler].join("/"));
            });
        });

        var methods = {

            // allow cross origin requests
            allow_cors: function(req, res, next){
                res.header("Access-Control-Allow-Origin",  "*");
                res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
                res.header("Access-Control-Allow-Headers", "Content-Type");

                if(req.method == "OPTIONS"){
                    res.stash.code = 200;
                    methods.handle_response(req, res, next);
                }
                else
                    return next();
            },

            // redirect to controlling leader
            redirect_to_controlling_leader: function(req, res, next){
                if(core.cluster.praetor.is_controlling_leader())
                    return next();
                else{
                    var controlling_leader = core.cluster.praetor.get_controlling_leader();

                    if(_.isUndefined(controlling_leader)){
                        res.stash.code = 503;
                        methods.handle_response(req, res, next);
                    }
                    else{
                        var port = req.headers.host.split(":");
                        if(port.length > 1)
                            port = port[1];
                        else
                            port = 80;

                        var scope = core.options.legiond.network.public ? "public" : "private";

                        var location = [req.protocol, "://", controlling_leader.address[scope], ":", port, req.url].join("");
                        res.redirect(307, location);
                    }
                }
            },

            // ensure client accepts json
            json_request: function(req, res, next){
                if(req.accepts("application/json"))
                    return next();

                res.stash.code = 406;
                methods.handle_response(req, res, next);
            },

            // init response
            init_response: function(req, res, next){
                res.stash = {};
                res.response_start = new Date();
                return next();
            },

            job_exists: function(req, res, next){
                if(_.has(tide_scheduler.jobs, req.params.job))
                    return next();

                res.stash.code = 404;
                methods.handle_response(req, res, next);
            },

            job_missing: function(req, res, next){
                if(!_.has(tide_scheduler.jobs, req.params.job))
                    return next();

                res.stash.code = 404;
                methods.handle_response(req, res, next);
            },

            // get appropriate handler
            get_handler: function(handler, method){
                return function(req, res, next){
                    if(!_.contains(_.keys(handlers), req.params.api_version))
                        methods.handle_response(req, res, next);
                    else if(!_.has(handlers[req.params.api_version], handler))
                        methods.handle_response(req, res, next);
                    else if(!_.has(handlers[req.params.api_version][handler], method))
                        methods.handle_response(req, res, next);
                    else
                        handlers[req.params.api_version][handler][method](req, res, next);
                }
            },

            // respond to client
            handle_response: function(req, res, next){
                res.setHeader("X-Tide-Response-Time", new Date() - res.response_start);

                res.stash = _.defaults(res.stash, {
                    code: 404
                });

                if(_.has(res.stash, "body"))
                    res.status(res.stash.code).json(res.stash.body);
                else
                    res.sendStatus(res.stash.code);

                core.loggers["tide-scheduler"].log("debug", [req.ip, "-", ["HTTP", req.httpVersion].join("/"), req.method, req.url, "-", res.stash.code].join(" "));
            }

        }

        return methods;

    }

}

