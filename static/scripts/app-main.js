const { ipcRenderer } = require('electron');
const { shell } = require('electron');

const _app = new Vue({
    el: '#app',
    data: function() {
        return { 
            version:'',
            m3u8_url: '',
            m3u8_urls: '',
            ts_dir:'',
            ts_urls:[],
            m3u8_url_prefix:'',
            dlg_header_visible: false,
            dlg_newtask_visible: false,
            config_save_dir:'',
            config_ffmpeg:'',
            config_proxy:'',
            headers:'',
            myKeyIV:'',
            myLocalKeyIV:'',
            taskName:'',
            taskIsDelTs:true,
            allVideos:[],
            tabPane:'',
            tsMergeType:'speed',
            tsMergeProgress:0,
            tsMergeStatus:'',
            tsMergeMp4Path:'',
            tsMergeMp4Dir:'',
            tsTaskName:'',
            downloadSpeed:'0 MB/s',
            playlists:[],
            playlistUri:'',
            addTaskMessage:'',
            navigatorInput:'',
            //navigatorUrl:'about:blank',
            navigatorUrl:'https://haokan.baidu.com/?sfrom=baidu-top',
            currentUserAgent:"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
            browserVideoUrls:[],
            platform:''
        }
    },
    methods:{
        installEvent:function(e){
            let that = this;

            ipcRenderer.on('message',this.message.bind(this));

            ipcRenderer.on('open-select-m3u8-reply',function(event,data){
                that.m3u8_url = data;
            });
            ipcRenderer.on('open-select-ts-dir-reply',function(event,data){
                that.ts_dir = data;
            });
            ipcRenderer.on('open-select-ts-select-reply',function(event,data){
                that.ts_urls = data;
                that.ts_dir = `chosen [${that.ts_urls.length}] videos`;
            });

            ipcRenderer.on('task-add-reply',function(event,data){
                if(data.code != 1)
                {
                    that.dlg_newtask_visible = false;
                    that.taskName = '';
                    that.m3u8_url = '';
                    that.m3u8UrlChange();
                    that.notifyTaskStatus(data.code,data.message);
                    return;
                }
                that.playlists = data.playlists;
                that.playlistUri = that.playlists[0].uri;
                that.addTaskMessage = "Please select an image quality";
            });
            ipcRenderer.on('task-notify-create',function(event,data){
                that.allVideos.splice(0,0,data);
            });
            ipcRenderer.on('task-notify-update',function(event,data){
                for (let idx = 0; idx < that.allVideos.length; idx++) {
                    let e = that.allVideos[idx];
                    if(e.id == data.id)
                    {
                        Vue.set(that.allVideos,idx,data);
                        return;
                    }
                }
            });

            ipcRenderer.on('task-notify-end',function(event,data){
                for (let idx = 0; idx < that.allVideos.length; idx++) {
                    let e = that.allVideos[idx];
                    if(e.id == data.id)
                    {
                        Vue.set(that.allVideos,idx,data);
                        return;
                    }
                }
            });
            ipcRenderer.on('start-merge-ts-status',function(event,msg){

                if(msg.progress != -1)  that.tsMergeProgress = msg.progress;
                if(msg.status) that.tsMergeStatus = msg.status;
                if(msg.code == 1){
                    that.tsMergeMp4Dir = msg.dir;
                    that.tsMergeMp4Path = msg.path;
                } 
            });
            
            ipcRenderer.on('delvideo-reply',function(event,data){
                for (let idx = 0; idx < that.allVideos.length; idx++) {
                    let e = that.allVideos[idx];
                    if(e.id == data.id)
                    {
                        that.allVideos.splice(idx, 1);
                        return;
                    }
                }
            });

            let browser = document.querySelector('#browser');
            browser.addEventListener('new-window',(e) => {
                const protocol = (new URL(e.url)).protocol
                if (protocol === 'http:' || protocol === 'https:') {
                    browser.loadURL(e.url)
                }
            });
            let navigateEvent = (e) => {
                that.navigatorInput = e.url;
                that.browserVideoUrls = [];
            }
            browser.addEventListener('will-navigate',navigateEvent);
            browser.addEventListener('did-navigate',navigateEvent);
            browser.addEventListener('dom-ready',()=>{
                browser.openDevTools();
            });
        },
        message:function(_,{ version, downloadSpeed, 
            config_ffmpeg, config_save_dir, config_proxy,videoDatas,browserVideoItem,platform})
        {
            version && (this.version = version);
            downloadSpeed && (this.downloadSpeed = downloadSpeed);
            config_ffmpeg && (this.config_ffmpeg = config_ffmpeg);
            config_save_dir && (this.config_save_dir = config_save_dir);
            config_proxy && (this.config_proxy = config_proxy);
            videoDatas && (this.allVideos = videoDatas);
            browserVideoItem && (this.browserVideoUrls.push(browserVideoItem))
            platform && (this.platform = platform);
        },
        clickNaviagte: function(e){
            if(!this.navigatorInput) return;
            !/^http[s]\:\/\//.test(this.navigatorInput) && (this.navigatorInput = 'http://' + this.navigatorInput);
            this.navigatorUrl != this.navigatorInput && (this.navigatorUrl = this.navigatorInput);
        },
        navigateBy: function(val) {
            let browser = document.querySelector('#browser')
            switch (val) {
                case -1:
                    if(browser.canGoBack())browser.goBack();
                    break;
                case 0:
                    browser.reload();
                    break;
                case 1:
                    if(browser.canGoForward())browser.goForward();
                    break;
                default:
                    break;
            }

        },
        clickAClick: function(e){
            e.preventDefault();
            console.log(e.target.href);
            shell.openExternal(e.target.href);
        },
        clickStartHookUrl:function(e){
            ipcRenderer.send('new-hook-url-window');
        },
        clickClose:function(e){
            ipcRenderer.send('hide-windows');
        },
        clickGotoSettingTab:function(e){
            this.tabPane = "setting";
        },
        clickNewTask:function(e){
            if(!this.config_save_dir)
            {
                this.clickGotoSettingTab();
                this.$message({title: 'hint',type: 'error',message: "Please set the storage path first before starting to download the video",offset:100,duration:1000});
                return;
            }
            this.dlg_newtask_visible = true;
            this.taskName = '';
            this.m3u8_url = '';
            this.m3u8UrlChange();
        },
        clickNewTaskOK:function(e){
            if( this.m3u8_url != '')
            {
                let m3u8_url = this.m3u8_url;
                if(this.playlistUri != '')
                {
                    const uri = this.playlistUri;
                    if(!uri.startsWith('http'))
                    {
                        m3u8_url = uri[0] == '/' ? (m3u8_url.substr(0, m3u8_url.indexOf('/', 10)) + uri) :
                            (m3u8_url.replace(/\/[^\/]*((\?.*)|$)/,'/') + uri);
                    }
                    else{
                        m3u8_url = uri;
                    }
                }

                ipcRenderer.send('task-add', { url: m3u8_url,
                     headers: this.headers,
                     myKeyIV: this.myKeyIV,
                     taskName: this.taskName,
                     taskIsDelTs:this.taskIsDelTs,
                     url_prefix:this.m3u8_url_prefix
                });

                this.addTaskMessage = "Checking link..."
            }
            else
            {
                this.$message({title: 'hint',type: 'error',message: "Please enter the correct M3U8-URL or import (.m3u8) file",offset:100,duration:1000});
            }
        },
        clickClearTask:function(e){
            ipcRenderer.send('task-clear');
            this.allVideos = [];
        },
        clickNewTaskMuti:function(e){
            if(!this.config_save_dir)
            {
                this.clickGotoSettingTab();
                this.$message({title: 'hint',type: 'error',message: "Please set the storage path first before starting to download the video",offset:100,duration:1000});
                return;
            }
            if( this.m3u8_urls != '')
            {
                ipcRenderer.send('task-add-muti', { m3u8_urls: this.m3u8_urls,
                     headers: this.headers,
                     taskIsDelTs:this.taskIsDelTs,
                     myKeyIV:'',
                     taskName:''
                });
                this.dlg_newtask_visible = false;
                this.taskName = '';
            }
            else
            {
                this.$message({title: 'hint',type: 'error',message: "Please enter the correct M3U8-URL",offset:100,duration:1000});
            }
        },
        clickOpenConfigDir:function(e){
            ipcRenderer.send("open-config-dir");
        },
        clickItemOptData:function(e){
            let that = e.target;
            var opt = that.getAttribute('opt');
            if(opt == "StartOrStop")
            {
                that.value = that.value == "stop"?"restart":"stop";
            }
            ipcRenderer.send(that.getAttribute('opt'),that.getAttribute('data'));
        },
        getPlaylistLabel:function(playlist){
            if(!playlist || !playlist.attributes) return '';
            const attr = playlist.attributes;
            if(attr.BANDWIDTH)
            {
                return `Code rate - ${attr.BANDWIDTH}`;
            }
            if(attr.bandwidth)
            {
                return `Code rate - ${attr.bandwidth}`;
            }
            if(attr.RESOLUTION)
            {
                return `resolution - ${attr.RESOLUTION.width}x${attr.RESOLUTION.height}`;
            }
            if(attr.resolution)
            {
                return `resolution - ${attr.resolution.width}x${attr.resolution.height}`;
            }
            return 'Link - ' + playlist.uri;
        },
        proxyChange:function(){
            ipcRenderer.send('set-config',{key:'config_proxy',value:this.config_proxy});
        },
        m3u8UrlChange:function(){
            this.playlists = [];
            this.playlistUri = '';
            this.addTaskMessage = "Please enter M3U8 video source";
        },
        notifyTaskStatus:function(code,message){
            this.$notify({title: 'hint',type: (code == 0? 'success':'error'),message: message,showClose: true,duration:3000,position:'bottom-right'});
        },
        clickOpenLogDir:function(e){
            ipcRenderer.send('open-log-dir');
        },
        clickSelectM3U8:function(e){
            ipcRenderer.send('open-select-m3u8');
        },
        clickSelectTSDir:function(e){
            ipcRenderer.send('open-select-ts-dir');
        },
        clickStartMergeTS:function(e){
            this.tsMergeMp4Dir = '';
            this.tsMergeMp4Path = '';
            this.tsMergeProgress = 0;
            this.tsMergeStatus = '';
            if(!this.config_save_dir)
            {
                this.clickGotoSettingTab();
                this.$message({title: 'hint',type: 'error',message: "Please set the storage path first before starting to download the video",offset:100,duration:1000});
                return;
            }
            ipcRenderer.send('start-merge-ts',{
                ts_files:this.ts_urls,
                mergeType:this.tsMergeType,
                name:this.tsTaskName
            });
        },
        clickClearMergeTS:function(e){
            this.ts_dir = '';
            this.ts_urls = [];
            this.tsTaskName = '';
            this.tsMergeMp4Dir = '';
            this.tsMergeMp4Path = '';
            this.tsMergeProgress = 0;
            this.tsMergeStatus = '';
        },
        clickOpenMergeTSDir:function(e){
            ipcRenderer.send('opendir',this.tsMergeMp4Dir,this.tsMergeMp4Path);
        },
        clickPlayMergeMp4:function(e){
            ipcRenderer.send('playvideo',this.tsMergeMp4Path);
        },
        dropM3U8File:function(e){
            e.preventDefault();

            if(!e.dataTransfer || 
                !e.dataTransfer.files || 
                e.dataTransfer.files.length == 0)
            {
                return;
            }
            let p = e.dataTransfer.files[0].path;
            this.m3u8_url = `file:///${p}`;
        },
        dropTSFiles:function(e){
            e.preventDefault();

            if(!e.dataTransfer || 
                !e.dataTransfer.files || 
                e.dataTransfer.files.length == 0)
            {
                return;
            }
            let _filePath = [];
            for (let index = 0; index < e.dataTransfer.files.length; index++) {
                const f = e.dataTransfer.files[index];
                if(f.path.endsWith('.ts') || f.path.endsWith('.TS'))
                { 
                    _filePath.push(f.path);
                }
            }
            if(_filePath.length)
            {
                this.ts_urls = _filePath;
                this.ts_dir = `chosen [${_filePath.length}] videos`;

            }else if(e.dataTransfer.files.length == 1)
            {
                this.ts_dir = e.dataTransfer.files[0].path;
                ipcRenderer.send('open-select-ts-dir',e.dataTransfer.files[0].path);
            }
        },
        clickRefreshComment:function(e){
            var GUEST_INFO = ['nick','mail','link'];
            var guest_info = 'nick'.split(',').filter(function(item){
                return GUEST_INFO.indexOf(item) > -1
            });
            console.log(guest_info)
            var notify = 'false' == true;
            var verify = 'false' == true;
            new Valine({
                el: '.vcomment',
                notify: notify,
                verify: verify,
                appId: "dYhmAWg45dtYACWfTUVR2msp-gzGzoHsz",
                appKey: "SbuBYWY21MPOSVUCTHdVlXnx",
                placeholder: "You can consult and communicate here",
                pageSize:'100',
                avatar:'mm',
                lang:'zh-cn',
                meta:guest_info,
                recordIP:true,
                path:'/m3u8-downloader'
            });
        }
    },
    mounted:function(){
        this.installEvent();
    }
});