"let strict";function isElectron(){if(typeof window!=='undefined'&&typeof window.process==='object'&&window.process.type==='renderer'){return true;}
if(typeof process!=='undefined'&&typeof process.versions==='object'&&!!process.versions.electron){return true;}
if(typeof navigator==='object'&&typeof navigator.userAgent==='string'&&navigator.userAgent.indexOf('Electron')>=0){return true;}
return false;}
function extend(obj,src){for(var key in src){if(src.hasOwnProperty(key))obj[key]=src[key];}
return obj;}
function httpRequest(options,proxy,cookies,timeout){return new Promise(async function(resolve,reject){if(typeof document.proxiedHttpRequest=="undefined"||!proxy)
$.ajax(extend({success:function(returnData){resolve(returnData);},error:function(xhr,status,error){console.error(xhr,error);reject(xhr.responseJSON||xhr.responseText,error);}},options));else{document.proxiedHttpRequest(options,proxy,cookies,resolve,reject,timeout);}});}
var gen_status_text_priority=0;function change_gen_status_text(text,priority){if(!priority)
priority=0;if(priority>=gen_status_text_priority){if(text){$("#generate_status").text(text);gen_status_text_priority=priority;}else
gen_status_text_priority=0;}}
function displayerror(errortext){if(errortext){$("#generic_error").show("slow");$("#generic_error").text(errortext);}else
$("#generic_error").hide("slow");}
function parseSteamError(code,report,proxymgr){switch(code){case 13:return{error:'The email chosen by our system was invalid. Please Try again.'};case 14:return{error:'The account name our system chose was not available. Please Try again.'};case 84:if(proxymgr)
proxymgr.proxy.ratelimit();return{error:'Steam is limitting account creations from your IP or this email address (if using Gmail). Try again later.'};case 101:if(proxymgr)
proxymgr.proxy.ban();return{error:'Captcha failed or IP banned by steam (vpn?)'};case 17:if(report)
report_email();return{error:'Steam has banned the domain. Please use Gmail or Custom domain'};case 1:return{};default:return{error:'Error while creating the Steam account! Check console for details!'};}}
async function generateAccount(recaptcha_solution,proxymgr,statuscb,id){function update(msg){statuscb(msg,id);}
var ret={success:false,account:null,error:{steamerror:null,message:null},id:id,proxy:proxymgr}
var proxy;if(ret.proxy){if(!ret.proxy.proxy.uri){ret.error.message=ret.proxy.proxy.emulated?"Account generation stopped due to a previous error.":'No valid proxy found! Check the proxy list for banned proxies!';return ret;}
if(ret.proxy.proxy.emulated)
proxy=null;else
proxy=ret.proxy.proxy.uri;console.log(ret.proxy)}
var cookies=undefined;if(typeof document.toughCookie!="undefined")
cookies=new document.toughCookie.CookieJar();update("Getting GID...");var gid=await httpRequest({url:"https://store.steampowered.com/join/refreshcaptcha/"},proxy,cookies,15000).catch(function(){});if(!gid){if(ret.proxy)
ret.proxy.proxy.error();ret.error.message=!proxy?"Invalid data recieved from steam!":"Proxy couldn't contact Steam!";return ret;}
console.log(gid);if(gid.gid)
gid=gid.gid
else
gid=JSON.parse(gid).gid;if(typeof recaptcha_solution!="string"){var res=await recaptcha_solution.getCaptchaSolution(id);if(!res){ret.error.message='Getting captcha solution failed. Check your 2Captcha API key.';return ret;}
recaptcha_solution=res;}
var err=undefined;var custom_email=undefined;if($("#settings_custom_domain").val()!=""){if($("#settings_custom_domain").val().includes("@")){var email_split=$("#settings_custom_domain").val().toLowerCase().split("@");custom_email=email_split[0].replace(/\./g,'')+"@"+email_split[1];}else
custom_email=makeid(10)+"@"+$("#settings_custom_domain").val().toLowerCase();}
update("Getting registration data...");var data=await new Promise(function(resolve,reject){$.ajax({url:'/userapi/recaptcha/addtask',method:'post',dataType:'json',contentType:'application/json',data:JSON.stringify({step:"getdata"}),success:function(returnData){resolve(returnData);},error:function(xhr,status,error){console.error(xhr);reject(xhr.responseJSON);}});}).catch(function(error){err=error?error:true;console.log(err);});if(err){if(err.error){ret.error.message=err.error;return ret;}
ret.error.message='Error returned by SAG backend! Check console for details!';return ret;}
update("Waiting for confirmation from steam...");var ajaxverifyemail=await httpRequest({url:"https://store.steampowered.com/join/ajaxverifyemail",method:'POST',data:stringifyQueryString({email:custom_email?custom_email:data.email,captchagid:gid,captcha_text:recaptcha_solution})},proxy,cookies).catch(function(){err=error?error:true;console.log(err);});if(err){ret.error.message='Error while creating the Steam account! Check console for details!';return ret;}
if(ajaxverifyemail&&ajaxverifyemail.success){if(ajaxverifyemail.sessionid==null){ret.error.message='Steam is limitting account creations from your IP. Try again later.';return ret;}
if(ajaxverifyemail.success!=1){ret.error.steamerror=ajaxverifyemail.success;return ret;}else{if(ret.proxy)
ret.proxy.proxy.verify();}}
update("Fetching email from email server...");var verifydata=await new Promise(function(resolve,reject){$.ajax({url:'/userapi/recaptcha/addtask',method:'post',dataType:'json',contentType:'application/json',data:JSON.stringify({step:"getverify",email:($("#settings_custom_domain").val()!="")?custom_email:data.email}),success:function(returnData){resolve(returnData);},error:function(xhr,status,error){console.error(xhr);reject(xhr.responseJSON);}});}).catch(function(error){err=error?error:true;console.log(err);});if(err){if(err.error){ret.error.message=err.error;return ret;}
ret.error.message='Error returned by SAG backend! Check console for details!';return ret;}
update("Verifying email...");await httpRequest({url:verifydata.verifylink},proxy,cookies).catch(function(){err=error?error:true;console.log(err);});if(err){ret.error.message='Error while creating the Steam account! Check console for details!';return ret;}
update("Creating Account...");var createaccount=await httpRequest({url:"https://store.steampowered.com/join/createaccount",method:'POST',data:'accountname='+data.username+'&password='+data.password+'&count=4&lt=0&creation_sessionid='+verifydata.creationid},proxy,cookies).catch(function(error){err=error?error:true;console.log(err);});if(err){ret.error.message='Error while creating the Steam account! Check console for details!';return ret;}
if(!createaccount.bSuccess){ret.error.message='Error while creating the Steam account! Check console for details!';return ret;}
update("Disabling steam guard and adding CS:GO...");var account=await new Promise(function(resolve,reject){$.ajax({url:'/userapi/recaptcha/addtask',method:'post',dataType:'json',contentType:'application/json',data:JSON.stringify({step:"steamguard",username:data.username,password:data.password,email:($("#settings_custom_domain").val()!="")?custom_email:data.email}),success:function(returnData){resolve(returnData);},error:function(xhr,status,error){console.error(xhr);reject(xhr.responseJSON);}});}).catch(function(error){err=error?error:true;console.log(err);});if(err){if(err.error){ret.error.message=err.error;return ret;}
ret.error.message='Error returned by SAG backend! Check console for details!';return ret;}
ret.account=account;if(ret.account&&typeof post_generate!="undefined"){ret=await post_generate(ret,update);}
if(ret.account){update("Success!");ret.success=true;}
return ret;}
var proxylist={proxylist:[],getProxy:function(){var proxies=this.proxylist;var time=Date.now();proxies=proxies.filter(function(value){return!value.banned&&!value.errored&&(!value.timeout||value.timeout<time);})
proxies.sort(function(a,b){if(a.verified==b.verified)
return 0;if(a.verified)
return-1;if(b.verified)
return 1;return 0;})
return{proxy:$.extend(proxies[0],{verify:function(){this.verified=true;this.bancounter=0;this.errorcount=0;proxylist.dump();},ratelimit:function(){this.timeout=Date.now()+12*60*60*1000;proxylist.dump();},ban:function(){if(!this.bancounter)
this.bancounter=1;else
this.bancounter++;if(this.bancounter>=2&&!this.verified)
this.banned=true;else if(this.bancounter>=4&&this.verified)
this.timeout=Date.now()+12*60*60*1000;proxylist.dump();},error:function(){if(!this.verified){this.errored=true;}else{if(this.errorcount>=1)
this.errored=true;else{this.timeout=Date.now()+12*60*60*1000;this.errorcount=1;}}
proxylist.dump();}})}},import:function(text){var proxies=text.split("\n");for(var i in proxies){var err=false;var proxy=proxies[i];try{new URL(proxy);}catch(error){err=true;}
if(!err){if(this.proxylist.find(o=>o.uri==proxy))
continue;this.proxylist.push({uri:proxy})}}
proxylist.dump();},dump:function(){localStorage.setItem("proxylist",JSON.stringify(this.proxylist))},load:function(){var data=localStorage.getItem("proxylist");if(proxylistLinter(data))
this.proxylist=JSON.parse(data);}}
function edit_proxy_json(){if(proxylist.proxylist.length>0)
$("#proxy_json_textbox").val(JSON.stringify(proxylist.proxylist,null,4));else
$("#proxy_json_textbox").val('');$("#proxy_json").modal('show');}
function proxylistLinter(list){var data;try{data=JSON.parse(list)}catch(e){return false;}
if(Array.isArray(data)){for(var i in data){var entry=data[i];if(!entry.uri){return false;}
try{new URL(entry.uri);}catch(error){return false;}}}else
return false;return true;}
function save_proxy_json(){var data=$("#proxy_json_textbox").val();$("#proxy_json").modal('hide');if(data==""){proxylist.proxylist=[];proxylist.dump();return;}
if(!proxylistLinter(data)){displayerror("Invalid format!");return;}else{proxylist.proxylist=JSON.parse(data);proxylist.dump();$("#proxy_json").modal('hide');}}
function proxy_list_save(){proxylist.import($("#proxy_list_input").val())
$('#proxy_list_input').val('')}
function parseErrors(data,report){if(!data||(!data.success&&!data.error.message&&!data.error.steamerror)){return "Unknown error!"}
if(data.success==true)
return;if(data.error.message)
return data.error.message;if(data.error.steamerror)
return parseSteamError(data.error.steamerror,report,report?data.proxy:undefined).error;return "Unknown error!"}
async function generateAccounts(count,proxylist,captcha,multigen,statuscb,generationcallback){if(!multigen)
multigen=1;var accounts=[];var concurrent=0;if(generationcallback)
change_gen_status_text(`Mass generation in progress... ${accounts.length}/${count}`);for(var i=0;i<count;i++){while(concurrent>=multigen)
await sleep(500);concurrent++;statuscb("Starting...",i);generateAccount(captcha,proxylist?proxylist.getProxy():undefined,statuscb,i).then(function(res){if(generationcallback)
generationcallback(res,res.id);accounts.push(res);if(generationcallback)
change_gen_status_text(`Mass generation in progress... ${accounts.length}/${count}`);console.log(res);concurrent--;},function(err){accounts.push({success:false,error:{message:"Unknown error! Please send the error found in your browser console to the developers!"}})
console.error(err);concurrent--;})}
while(concurrent>0)
await sleep(500);console.log(accounts)
return accounts;}
function registerevents(){var eventMethod=window.addEventListener?"addEventListener":"attachEvent";var eventer=window[eventMethod];var messageEvent=eventMethod=="attachEvent"?"onmessage":"message";eventer(messageEvent,async function(e){if(e.origin!="https://store.steampowered.com")
return
if(e.data=="recaptcha-setup")
return;if(typeof e.data!=='string'||e.data.length<200)
return;if(e.data.split(";").length!=2){alert("Invalid data received from addon");return;}
change_visibility(true);var recap_token=e.data.split(";")[0];var account=(await generateAccounts(1,null,recap_token,null,function statuscb(msg,id){change_gen_status_text(msg);}))[0];var error=parseErrors(account,true);if(error){displayData({error:error});return;}
displayData(account.account);},false);}
function report_email(email){grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM',{action:'vote_email'}).then(function(token){$.ajax({url:'/userapi/recaptcha/bademail/'+token}).done(function(emailresp){console.log("Log: email reported ban");})})}
function stringifyQueryString(params){return queryString=Object.keys(params).map(key=>key+'='+params[key]).join('&');}
function makeid(length){var result='';var characters='abcdefghijklmnopqrstuvwxyz';var charactersLength=characters.length;for(var i=0;i<length;i++){result+=characters.charAt(Math.floor(Math.random()*charactersLength));}
return result;}
var electronStatusOnly;function on_status_received(resp){if(resp.electron){if(resp.status)
electronStatusOnly=true;else
electronStatusOnly=false;}else{if(electronStatusOnly)
return;}
if(resp.status){document.getElementById("accgen_status_msg").textContent=resp.status;$("#accgen_status").show("slow");}else{$("#accgen_status").hide("slow");}}
function perform_status_check(){$.ajax({url:"/api/v1/status"}).done(function(resp){on_status_received(resp)})}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
function isMobile(){var check=false;(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))check=true;})(navigator.userAgent||navigator.vendor||window.opera);return check;};function isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent)&&!window.MSStream;}
function GetBrowser(){if(typeof InstallTrigger!=='undefined')
return "Firefox";if(!!window.chrome&&(!!window.chrome.webstore||!!window.chrome.runtime))
return "Chrome";var isIE=false||!!document.documentMode;if(isIE&&!!window.StyleMedia)
return "Edge";if((!!window.opr&&!!opr.addons)||!!window.opera||navigator.userAgent.indexOf(' OPR/')>=0)
return "Opera";gtag('event','newgen_unsupported_browser');return "Unsupported";}
function AddonsNotSupported(){window.location="legacy.html";}
function changeText(){switch(GetBrowser()){case "Firefox":if(isIOS())
return AddonsNotSupported("Firefox IOS")
document.getElementById("addon_download_text").textContent="You don't have our Firefox addon yet!";document.getElementById('ffaddon').href='https://addons.mozilla.org/firefox/addon/sag/';document.getElementById('ffaddon').target="_blank";document.getElementById('ffaddon').onclick="";break;case "Chrome":if(isMobile())
return AddonsNotSupported("Chrome Mobile");document.getElementById("addon_download_text").textContent="You don't have our Chrome addon yet!";document.getElementById('ffaddon').href='https://chrome.google.com/webstore/detail/sag/piljlfgibadchadlhlcfoecfbpdeiemd';document.getElementById('ffaddon').target="_blank";document.getElementById('ffaddon').onclick="";break;case "Opera":if(isMobile())
return AddonsNotSupported();document.getElementById("addon_download_text").textContent="You don't have our Opera addon yet!";document.getElementById('ffaddon').href='https://addons.opera.com/en/extensions/details/sag/';document.getElementById('ffaddon').target="_blank";document.getElementById('ffaddon').onclick="";break;case "Yandex":if(isIOS())
return AddonsNotSupported("Yandex IOS")
document.getElementById("addon_download_text").textContent="You don't have our Yandex addon yet!";document.getElementById('ffaddon').href='https://chrome.google.com/webstore/detail/sag/piljlfgibadchadlhlcfoecfbpdeiemd';document.getElementById('ffaddon').target="_blank";document.getElementById('ffaddon').onclick="";break;default:return AddonsNotSupported();}}
async function getRecaptchaSolution(){var res=await httpRequest({url:`https://2captcha.com/in.php?key=${$("#settings_twocap").val()}&method=userrecaptcha&googlekey=6LerFqAUAAAAABMeByEoQX9u10KRObjwHf66-eya&pageurl=https://store.steampowered.com/join/&header_acao=1&soft_id=2370&json=1`}).catch(function(err){console.log(err);throw new Error("2Captcha sent invalid or empty json!");});if(!res.request)
throw new Error("2Captcha sent invalid json!");console.log("2captcha requestid: "+res.request);await sleep(10000);for(var i=0;i<20;i++){await sleep(5000);var ans_res=await httpRequest({url:`https://2captcha.com/res.php?key=${$("#settings_twocap").val()}&action=get&id=${res.request}&json=1&header_acao=1`})
console.log(ans_res)
if(ans_res.status==0)
continue;res=ans_res;break;}
if(res.status==1)
return res.request;else
throw new Error("2Captcha error!");}
async function mass_generate_clicked(){function alter_table(id,data){if(isNaN(id)){console.log("Invalid ID");return;}
if(data.username)$('#status_table tr').eq(id).find('td').eq(1).html(data.username);if(data.password)$('#status_table tr').eq(id).find('td').eq(2).html(data.password);if(data.email)$('#status_table tr').eq(id).find('td').eq(3).html(data.email);if(data.status)$('#status_table tr').eq(id).find('td').eq(4).html(data.status);}
var max_count=$("#mass_gen_count").val();var concurrency=$("#mass_gen_concurrency").val();if(!max_count||isNaN(max_count)||max_count<1){displayerror("Count must be a non 0 and non negative number!");return false;}
if(!concurrency||isNaN(concurrency)||concurrency<1){displayerror("Concurrency must be a non 0 and non negative number!");return false;}
$("#status_table").empty();for(var i=0;i<max_count;i++)
$("#status_table").append(`<tr>
            <td>${i}</td>
            <td>null</td>
            <td>null</td>
            <td>null</td>
            <td>Waiting...</td>
            </tr>`);change_visibility(true);$("#generation_status").show("slow");function statuscb(msg,id){alter_table(id,{status:msg});}
var captcha={getCaptchaSolution:async function(id){for(var i=0;i<2;i++){try{statuscb("Getting captcha solution...",id);return await getRecaptchaSolution();}catch(error){statuscb("Getting captcha solution failed!",id);console.error(error);if(i==0)
await sleep(3000);}}}}
function generationcallback(account,id){var error=parseErrors(account,true);if(error){alter_table(id,{status:error})
return;}
alter_table(id,{status:"Finished!",username:account.account.login,password:account.account.password,email:account.account.email})}
var proxy=$("#proxy_check:checked").val()&&typeof document.proxiedHttpRequest!="undefined"?proxylist:undefined;if(!proxy){proxy={localproxy:{proxy:{emulated:true,uri:"emulated",verify:function(){this.verified=true;this.bancounter=0;this.errorcount=0;},ratelimit:function(){this.uri=undefined;},ban:function(){if(!this.bancounter)
this.bancounter=1;else
this.bancounter++;if(this.bancounter>=3&&!this.verified)
this.uri=undefined;else if(this.bancounter>=4&&this.verified)
this.uri=undefined;},error:function(){if(!this.errorcount)
this.errorcount=1;else
this.errorcount++;if(this.errorcount>=3)
this.uri=undefined;}}},getProxy:function(){return this.localproxy}}}
var valid_accounts=[];var accounts=await generateAccounts(max_count,proxy,captcha,concurrency,statuscb,generationcallback);for(var i=0;i<max_count;i++){var account=accounts[i];var error=parseErrors(account,false);if(error){alter_table(i,{status:error})
continue;}
alter_table(i,{status:"Completed!",username:account.account.login,password:account.account.password,email:account.account.email})
if(account.account)
valid_accounts.push(account.account);}
change_visibility(false);if($("#down_check:checked").val()&&valid_accounts.length>=1)
download_account_list(valid_accounts);return false;}
async function commonGeneratePressed(){if($("#settings_twocap").val()!="")
{change_visibility(2);$("#mass_generator").modal('show');return;}
if($("#steam_iframe").is(":hidden"))
change_visibility(2);$("#steam_iframe").toggle("slow")
document.getElementById('steam_iframe_innerdiv').src="https://store.steampowered.com/join/";}
function commonChangeVisibility(pre_generate){if(pre_generate){$('#mx_error').hide("slow");$('#saved_success').hide("slow");$('#proxy_error').hide("slow");$('#twocap_error').hide("slow");$('#generate_error').hide("slow");$('#generated_data').hide("slow");$('#history_list').hide("slow");$('#steam_iframe').hide("slow");$("#generation_status").hide("slow");displayerror(undefined);if(pre_generate==1){$('#control_buttons').hide();$('#generate_progress').show("slow");}}else{$('#control_buttons').show();$('#generate_progress').hide("slow");}}
function addToHistory(acc_data){if(localStorage.getItem("genned_account")==null){localStorage.setItem("genned_account",JSON.stringify([]))}
localStorage.setItem("genned_account",JSON.stringify(JSON.parse(localStorage.getItem("genned_account")).concat(acc_data)));}
var lastacc;function displayData(acc_data){change_visibility(false);if(acc_data.error){$("#generate_error").show("slow")
$("#generate_error_text").html(acc_data.error)
return;}
addToHistory(acc_data);lastacc=acc_data;if(typeof document.startSteam!="undefined"){$("#electron_steam_signin").show();}
$("#acc_login").html(`Login: <a id="acc_link" target="_blank"><strong>${acc_data.login}</strong></a>`)
$("#acc_link").attr("href",`https://steamcommunity.com/profiles/${acc_data.steamid}`);$("#acc_pass").html(`Password: <strong>${acc_data.password}</strong>`)
$("#generated_data").show("slow");}
function electronSteamSignIn(){document.startSteam(lastacc);$("#electron_steam_signin").hide("slow");}
async function isvalidmx(domain){var patt=new RegExp("^([a-z0-9]+([\-a-z0-9]*[a-z0-9]+)?\.){0,}([a-z0-9]+([\-a-z0-9]*[a-z0-9]+)?){1,63}(\.[a-z0-9]{2,7})+$");if(!patt.test(domain))
return false;var res=await new Promise(function(resolve,reject){$.ajax({url:"/userapi/isvalidmx/"+domain,success:function(returnData){resolve(returnData);},error:function(){reject();}});}).catch(function(){console.error('DNS lookup failed!');})
if(!res||!res.valid)
return false;return true;}
function common_init(){if(isElectron()){if(typeof document.ipc!="undefined"){document.ipc.on('alert-msg',(event,arg)=>{on_status_received(arg);})
document.ipc.send("ready");console.log("Ready sent!");}else if(typeof ipc!="undefined"){ipc.on('alert-msg',(event,arg)=>{on_status_received(arg);})
ipc.send("ready");console.log("Ready sent!");}
window.setImmediate=typeof setImmediate==='function'?setImmediate:(...args)=>{args.splice(1,0,0);setTimeout(...args);};proxylist.load();}
if(localStorage.getItem("genned_account")!=null){$('#history_button').show();}
setInterval(perform_status_check,10000);perform_status_check();registerevents();$.ajax({url:"https://store.steampowered.com/join/"}).done(function(){}).fail(function(resp){changeText();$("#addon_dl").show();$("#accgen_ui").hide();$("#generate_button").hide();});load_settings()}
function displayhistorylist(data,showdownloadhistory){var shouldshow=data?true:false;if(shouldshow){change_visibility(2);$("#genned_accs").empty();$.each(data.reverse(),function(i,item){$('<tr class="table-primary">').html("<td>"+"<a href=\"https://steamcommunity.com/profiles/"+item.steamid+"\">"+item.login+"</a></td><td>"+item.password+"</td>").appendTo('#genned_accs');})}
if(shouldshow){$("#history_list").show('slow');if(showdownloadhistory)
$("#history_download_button").show();else
$("#history_download_button").hide();}else
$("#history_list").hide('slow');}
function history_pressed(){if($("#history_list").is(":hidden"))
displayhistorylist(JSON.parse(localStorage.getItem("genned_account")),true);else
displayhistorylist(undefined);return false;}
function download(filename,text){var element=document.createElement('a');element.setAttribute('href','data:text/plain;charset=utf-8,'+encodeURIComponent(text));element.setAttribute('download',filename);element.style.display='none';document.body.appendChild(element);element.click();document.body.removeChild(element);}
function download_account_list(accounts){var s="";for(var i=0;i<accounts.length;i++){s+=(accounts[i].login+":"+accounts[i].password)+"\r\n";}
var date=new Date();download(`accounts–${date.getFullYear()}-${date.getMonth()<10?"0"+date.getMonth():date.getMonth()}-${date.getDate()<10?"0"+date.getDate():date.getDate()}.txt`,s);}
function history_download_pressed(){download_account_list(JSON.parse(localStorage.getItem("genned_account")));return false;}
function save_settings(){$('input[type="text"]').each(function(){var id=$(this).attr('id');var value=$(this).val();localStorage.setItem(id,value);$("#saved_success").show('slow')});$('textarea').each(function(){var id=$(this).attr('id');var value=$(this).val();localStorage.setItem(id,value);$("#saved_success").show('slow')});}
function settings_help(page){switch(page){case "gmail":window.open("https://github.com/nullworks/accgen-web/wiki/Using-Your-Gmail-address-with-Steam-Account-Generator");break;case "mx":window.open("https://telegra.ph/file/5ceb2d563df573d3fa244.png");break;default:console.log("Invalid settings page");break;}}
function settings_pressed(){change_visibility(2);return false;}
function load_settings(){$('input[type="text"]').each(function(){var id=$(this).attr('id');var value=localStorage.getItem(id);$(this).val(value);});$('textarea').each(function(){var id=$(this).attr('id');var value=localStorage.getItem(id);$(this).val(value);});if(isElectron())
$("#proxy-settings").show();}
async function save_clicked(){gtag('event','settings_saved');if($("#settings_twocap").val()!=""){var res=await httpRequest({url:`https://2captcha.com/res.php?key=${$("#settings_twocap").val()}&action=getbalance&header_acao=1`}).catch(function(err_response,error){$("#twocap_error").show("slow");$("#settings_twocap").val("");});if(!res)
return false;if(res=="ERROR_KEY_DOES_NOT_EXIST"){$("#twocap_error").show("slow");$("#settings_twocap").val("");return false;}
$("#twocap_error").hide("slow");}else
$("#twocap_error").hide("slow");if($("#settings_custom_domain").val()==""){$("#mx_error").hide("slow");}else{if(!$("#settings_custom_domain").val().includes("@"))
if(await isvalidmx($("#settings_custom_domain").val())){$("#mx_error").hide("slow");}else{$("#mx_error").show("slow");$("#settings_custom_domain").val("");return false;}}
if($("#settings_proxy").val()!=""){var proxy=$("#settings_proxy").val();var res=await httpRequest({url:"https://store.steampowered.com/join/refreshcaptcha/"},proxy).catch(function(e){console.log(e)})
if(!res){$("#proxy_error").show("slow");$("#settings_proxy").val("")
return false;}}else
$("#proxy_error").hide("slow");save_settings();return false}