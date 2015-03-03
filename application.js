var ContainershipPlugin = require("containership.plugin");
var tide_scheduler = require([__dirname, "lib", "tide-scheduler"].join("/"));
var Server = require([__dirname, "lib", "server"].join("/"));
var server;

module.exports = new ContainershipPlugin({
    type: "core",

    initialize: function(core){
        if(core.options.mode == "leader"){
            // register tide logger
            core.logger.register("tide-scheduler");

            // initialize tide scheduler
            tide_scheduler.initialize(core);

            // start the server
            server = new Server(core);
            server.listen();
        }
    },

    reload: function(){
        server.exit();
    }
});
