var tide_scheduler = require([__dirname, "..", "..", "lib", "tide-scheduler"].join("/"));

module.exports = {

    get: function(req, res, next){
        res.stash.body = tide_scheduler.jobs[req.params.job].serialize();
        res.stash.code = 200;
        return next();
    },

    create: function(req, res, next){
        req.body.id = req.params.job;
        tide_scheduler.add_job(req.body, function(){
            res.stash.code = 201;
            return next();
        });
    },

    delete: function(req, res, next){
        tide_scheduler.remove_job(req.params.job, function(){
            res.stash.code = 204;
            return next();
        });
    }

}
