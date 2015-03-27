var fs = require("fs");
var async = require("async");
var _ = require("lodash");
var Job = require([__dirname, "job"].join("/"));

module.exports = {

    initialize: function(core){
        var self = this;
        this.core = core;

        this.core.cluster.legiond.on("tide.jobs.sync", function(jobs){
            async.each(_.keys(jobs), function(job, fn){
                self.add_job(jobs[job], fn);
            }, function(){
                self.core.loggers["tide-scheduler"].log("info", ["Synced", _.keys(jobs).length, "jobs from controlling leader!"].join(" "));
            });
        });

        this.core.cluster.legiond.on("tide.job.create", function(config){
            self.add_job(config, function(){});
        });

        this.core.cluster.legiond.on("tide.job.remove", function(id){
            self.remove_job(id, function(){});
        });
    },

    jobs: {},

    add_job: function(config, fn){
        var self = this;
        this.jobs[config.id] = new Job(config);
        this.core.loggers["tide-scheduler"].log("verbose", ["Added job:", config.id].join(" "));

        if(this.core.cluster.praetor.is_controlling_leader()){
            this.core.cluster.legiond.send("tide.job.create", config);
            config.application.id = ["tide", config.id].join(".");

            if(!_.has(config.application, "tags"))
                config.application.tags = {};

            if(!_.has(config.application.tags, "metadata"))
                config.application.tags.metadata = {};

            config.application.tags.metadata.plugin = "tide-scheduler";

            this.core.applications.add(config.application);

            this.jobs[config.id].schedule(function(){
                if(_.has(self.core.applications.list, config.application.id)){
                    async.timesSeries(config.instances, function(index, fn){
                        self.core.applications.deploy_container(config.application.id, {}, function(){
                            self.core.loggers["tide-scheduler"].log("verbose", ["Launched instance for job:", config.id].join(" "));
                            return fn();
                        });
                    }, function(){
                        var interval = setInterval(function(){
                            if(self.core.applications.list[config.application.id].serialize().containers.length == 0){
                                clearInterval(interval);
                                if(!config.schedule.recurring)
                                    self.remove_job(config.id, function(){});
                            }
                        }, 15000);
                    });
                }
                else
                    self.remove_job(config.id);
            });
        }

        return this.persist_jobs(fn);
    },

    persist_jobs: function(fn){
        var jobs = {};

        _.each(this.jobs, function(job, job_name){
            jobs[job_name] = job.serialize();
        });

        fs.writeFile("/tmp/tide.json", JSON.stringify(jobs), function(err){
            if(err){
                self.core.loggers["tide-scheduler"].log("warn", "Failed persist jobs to disk!");
                return fn(err);
            }

            return fn();
        });
    },

    remove_job: function(id, fn){
        this.core.loggers["tide-scheduler"].log("verbose", ["Removed job:", id].join(" "));

        if(this.core.cluster.praetor.is_controlling_leader()){
            this.jobs[id].cancel();
            this.core.cluster.legiond.send("tide.job.remove", id);
        }

        this.core.applications.remove(["tide", id].join("."));
        delete this.jobs[id];
        this.persist_jobs(fn);
    }

}
