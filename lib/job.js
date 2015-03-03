var _ = require("lodash");
var schedule = require("node-schedule");

function Job(config){
    this.config = config;
}

Job.prototype.schedule = function(fn){
    if(!_.has(this, "job"))
        this.job = schedule.scheduleJob(_.omit(this.config.schedule, "recurring"), fn);
}

Job.prototype.cancel = function(){
    this.job.cancel();
}

Job.prototype.serialize = function(){
    return this.config;
}

module.exports = Job;
