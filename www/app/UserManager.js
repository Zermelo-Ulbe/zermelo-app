Ext.define('Zermelo.UserManager', {
    alternateClassName: 'UserManager',
    singleton: true,
    code: window.localStorage.getItem('user_code') ? window.localStorage.getItem('user_code') : '~me',
    userChanged: false,


    getCode: function() {
    	console.log("get", this.code);
        return this.code;
    },

    setCode: function(newCode) {
    	this.code = newCode;
        window.localStorage.setItem('user_code', newCode);
    },

    refreshData: function() {
        deleteappointmentdatas();
        var store = Ext.getStore('AnnouncementStore');
        store.getProxy().clear();
        store.data.clear();
        store.sync();
    },

    setTitles: function() {
    	var title;

    	title = Ext.getCmp("toolbar_main");
    	if (title)
    		title.setTitle(this.getScheduleTitle());

    	title = Ext.getCmp("toolbar_day_back");
    	if (title)
    		title.setTitle(this.getScheduleTitle());

    	title = Ext.getCmp("message_title");
    	if (title)
    		title.setTitle(this.getAnnouncementsTitle());
    },

    setUser: function(newCode = '~me') {
    	if (this.code == newCode)
    		return;

    	this.setCode(newCode);
    	this.refreshData();
    	this.setTitles();
    },

    getScheduleTitle: function() {
    	if (loc == 'nl')
    		return this.code == '~me' ? "Rooster" : "Rooster van " + this.code;
    	else
    		return this.code == '~me' ? "Schedule" : "Schedule for " + this.code;
    },

    getAnnouncementsTitle: function() {
    	if (loc == 'nl')
    		return this.code == '~me' ? "Mededelingen" : "Mededelingen voor " + this.code;
    	else
    		return this.code == '~me' ? "Announcements" : "Announcements for " + this.code;
    }
});