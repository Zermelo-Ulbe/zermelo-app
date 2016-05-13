Ext.define('Zermelo.UserManager', {
    alternateClassName: 'UserManager',
    singleton: true,
    code: '~me',
    userChanged: false,

    construct: function() {
        console.log(this.code);
        var user_code = window.localStorage.getItem('user_code');
        if (user_code === undefined ||
            user_code == null ||
            user_code == '' ) {
			window.localStorage.setItem('user_code', '~me');
		}
    },

    setCode: function(newCode) {
    	console.log("set", this.code, newCode);
        if (this.code != newCode) {
            deleteappointmentdatas();
            var store = Ext.getStore('AnnouncementStore');
            store.getProxy().clear();
            store.data.clear();
            store.sync();
            this.code = newCode;
            window.localStorage.setItem('user_code', newCode);
            this.propagateUserChange();
        }
    },

    getCode: function() {
    	console.log("get", this.code);
        return this.code;
    },

    propagateUserChange: function() {
        deleteappointmentdatas();

        var store = Ext.getStore('AnnouncementStore');
        store.getProxy().clear();
        store.data.clear();
        store.sync();

        userChanged = true;

        if (loc == 'nl') {
            // Ext.getCmp("message_title").setTitle("Mededelingen");
            Ext.getCmp("toolbar_main").setTitle("Rooster");
        	Ext.getCmp("toolbar_day_back").setTitle("Rooster");
        } else {
            // Ext.getCmp("message_title").setTitle("Announcements");
            Ext.getCmp("toolbar_main").setTitle("Schedule");
        	Ext.getCmp("toolbar_day_back").setTitle("Schedule");
        }
    },

    setUserToSelf: function() {
    	if (this.code == '~me')
    		return;

    	this.code = '~me';
    	this.propagateUserChange();
    },

    setuserToSpecific: function(newCode) {

    }
});