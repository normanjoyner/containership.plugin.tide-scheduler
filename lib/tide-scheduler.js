var fs = require("fs");
var async = require("async");
var _ = require("lodash");
var Job = require([__dirname, "job"].join("/"));

module.exports = {

    initialize: function(core){
        var self = this;
        this.core = core;
    },

    jobs: {},

    add_job: function(config, fn){
        var self = this;
        this.jobs[config.id] = new Job(config);
        this.core.loggers["tide-scheduler"].log("verbose", ["Added job:", config.id].join(" "));

        if(this.core.cluster.praetor.is_controlling_leader()){
            config.application.id = ["tide", config.id].join(".");

            if(!_.has(config.application, "tags"))
                config.application.tags = {};

            if(!_.has(config.application.tags, "metadata"))
                config.application.tags.metadata = {};

            config.application.tags.metadata.plugin = "tide-scheduler";

            // force no respawn on application containers
            config.application.respawn = false

            this.jobs[config.id].schedule(function(){
                self.core.loggers["tide-scheduler"].log("verbose", ["Created tide application", config.application.id].join(" "));

                self.core.applications.remove(config.application.id, function(err){
                    self.core.applications.add(config.application, function(err){
                        async.timesSeries(config.instances, function(index, fn){
                            self.core.applications.deploy_container(config.application.id, {}, fn);
                        }, function(){
                            var interval = setInterval(function(){
                                self.core.cluster.myriad.persistence.keys([self.core.constants.myriad.CONTAINERS_PREFIX, application_name, "*"].join("::"), function(err, containers){
                                    if(containers.length == 0){
                                        clearInterval(interval);
                                        if(!config.schedule.recurring)
                                            self.remove_job(config.id, function(){});
                                    }
                                });
                            }, 15000);
                        });
                    });
                });
            });

            return fn();
        }
    },

    remove_job: function(id, fn){
        this.core.loggers["tide-scheduler"].log("verbose", ["Removed job:", id].join(" "));

        if(this.core.cluster.praetor.is_controlling_leader())
            this.jobs[id].cancel();

        this.core.applications.remove(["tide", id].join("."), function(err){
            if(!err)
                delete this.jobs[id];

            return fn(err);
        });
    }

}
