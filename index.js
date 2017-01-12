var express = require('express'),
    cfenv = require('cfenv'),
    request = require('request'),
    async = require('async');

var ENV = process.env,
    conductor_api = ENV.CONDUCTOR_API, //"http://0.0.0.0:8080/api",
    task_name = ENV.TASK_NAME,
    worker_id = ENV.WORKER_ID,
    isRunning = false;

/** ****************************************** **/
/*  EXPRESS STUFF                               */
/** ****************************************** **/
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv

// create a new express server
var app = express();

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

app.get('/', (req, res) => {
  res.send('ok');
});
/** ****************************************** **/
/*  /EXPRESS STUFF                              */
/** ****************************************** **/


function processTask(task_id, workflow_instance_id, input_data, callback){
    //Do work in here
    console.log("in process task");
    taskStatus = "COMPLETED";
    callback(null, task_id, workflow_instance_id, taskStatus);
}

function updateTaskStatus(task_id, workflow_instance_id, task_status, callback){
    console.log("updateTaskStatus");
    var str = "";
    var headers = {
      'headers': {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      'json': {
        'workflowInstanceId': workflow_instance_id,
        'taskId': task_id,
        'status': task_status
      }
    };

    request.post(conductor_api + "/tasks", headers, (req, res) => {
      var body = res.body;
      //console.log(body);
      if(res.statusCode != 204){
        return callback("[" + res.statusCode + "] Failed to update status");
      }
      callback();

    });
}

function getInProgessTasks(callback){
    var headers = {
      'headers': {
        'Accept': 'application/json'
      }
    };
    request.get(conductor_api + "/tasks/in_progress/" + task_name, headers, callback);
}

app.get('/approve', (request, result) =>{
  console.log("in approve");

  getInProgessTasks( (req, res) => {
    var i, body, data;

    data = "";
    body = JSON.parse(res.body);

    if(res.statusCode != 200 || !body){
      return result.send("[" + res.statusCode + "] Task not found");
    }

    console.log("body length: " + JSON.stringify(body[0]));

    for(i = 0; i < body.length; i++){
      data += '<form action="/approve/' + body[i].workflowInstanceId + '/' + body[i].taskId + '" method="post"><button> Approve (' + ( i + 1 ) + ' of ' + body.length + ')</button></form>' + "<br />";
    }
    result.send(data);
  });

});

app.post('/approve/:wid/:tid', (req, res) => {
    var wid = req.params.wid,
        tid = req.params.tid;
    console.log("wid: " + wid);
    console.log("tid: " + tid);
    async.waterfall([
      (callback) => { processTask(tid, wid, null, callback); },
      updateTaskStatus
    ], function(err){
      if(err){
        console.log(err);
        return res.send(err);
      }
      res.send("approved");
    });
});

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});
