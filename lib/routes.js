var _ = require("lodash");

// register handlers
exports.register = function(server, middleware){
    // api get jobs
    server.get("/:api_version/jobs", middleware.get_handler("jobs", "get"));

    // api get job
    server.get("/:api_version/jobs/:job", middleware.job_exists, middleware.get_handler("job", "get"));

    // api create application
    server.post("/:api_version/jobs/:job", middleware.job_missing, middleware.get_handler("job", "create"));

    // api delete job
    server.delete("/:api_version/jobs/:job", middleware.job_exists, middleware.get_handler("job", "delete"));
}
