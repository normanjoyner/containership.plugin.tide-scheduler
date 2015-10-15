var _ = require("lodash");
var tide_scheduler = require([__dirname, "..", "..", "lib", "tide-scheduler"].join("/"));

module.exports = {

    get: function(req, res, next){
        var jobs = {};
        _.each(tide_scheduler.jobs, function(job, job_name){
            tide_scheduler.jobs[job_name] = job.serialize();
        });

        res.stash.body = jobs;
        res.stash.code = 200;
        return next();
    }

}
