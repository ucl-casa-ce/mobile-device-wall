var socket;

$(document).ready(function() {
    $("#logLink").click(function() {
        $("#deviceLog").toggle();
    });

	socket = io.connect();

	socket.on('connect',function() {
	    $(".circle").addClass("connected");
	});

	socket.on('disconnect',function() {
	    $(".circle").removeClass("connected");
	});	

	socket.emit('getDevices');

    setInterval(function(){
        socket.emit('getDevices');
    }, 1000);

    socket.on('deviceList', function(data) {
        var devices = JSON.parse(data);
        var deviceList = "";
        for(var i = 0; i < Object.keys(devices).length; i++){
            var key = Object.keys(devices)[i]; 
            var deviceData = devices[key].data;
            
            var icon = ""; 
            if(deviceData.systemName == "iOS" || deviceData.systemName == "iPadOS"){
                icon += "<i class='fa-brands fa-apple'></i>";
            }
            if(deviceData.systemName == "android" ){
                icon += "<i class='fa-brands fa-android'></i>";
            }

            deviceList += "<div class='alert alert-success'>" + icon + "&nbsp Device: <b>"+deviceData.name+"</b> \
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp Model: <b>" + deviceData.model + "</b> \
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Version: <b>"+ deviceData.systemVersion + "</b> \
                    &nbsp;&nbsp;&nbsp;&nbsp;&nbsp Identifier: <b>"+deviceData.identifierForVendor+"</b></div>";
        }
         $("#device-list").html(deviceList);
        $("#number").html(Object.keys(devices).length);
    });

    socket.on('processLog', function(data) {
        term.write(data.data);
    });
    
});

var submitURL = function(url){
	socket.emit('load-page-on-wall', JSON.stringify({'wall-url': url}));
}

function handleKeyPress(e,form){
	var key=e.keyCode || e.which;
	if (key==13){
		$('#submitButton').click();
		$("#website-entry").blur();
	}
}

function submit(){
	var url = $("#website-entry").val();

	if(url != ""){
		$("#website-entry").val("");
		$("#website-entry").focus();
		submitURL(url);
		return true; 
	}

	return false;
}

function installApp(){
	var urlAddress = $("#website-entry").val();

    var errors = validate({website: urlAddress}, {website: {url: true}});

    if (!errors) {
        $("#installLog").show();

        $("#website-entry").val("");
		$("#website-entry").focus();
        $(":submit").attr("disabled", true);

		term.open(document.getElementById('terminal'));
		term.resize(140, 40);

        term.writeln('Installing Flutter App from \x1B[1;3;31m'+urlAddress+'\x1B[0m  ');
        term.writeln("********************************************************************************");

        var GitHub_URL = urlAddress;
        socket.emit('runFlutterInstall', GitHub_URL);

        return true;
    }

}

function refreshWall(){
    socket.emit('refresh_wall', JSON.stringify({}));
	return true;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}