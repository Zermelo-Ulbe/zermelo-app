Ext.define('Zermelo.controller.UserController', {
    extend: 'Ext.app.Controller',
    config: {
        refs: {
            // // ids
            // announcementlist: '#announcementlist',
            // messageDetails_back: '#messageDetails_back',
            // appointmentDetails_back: '#appointmentDetails_back',

            // // views xtype
            // messageList: 'messageList',
            // messageDetails: 'messageDetails',
            // home: 'home',
            // appointmentDetails: 'appointmentDetails',
        },
        // control: {
        //     announcementlist: {
        //         itemtap: 'onItemTap'
        //     },
        //     messageDetails_back: {
        //         tap: 'back_messageList'
        //     },
        //     appointmentDetails_back: {
        //         tap: 'back_schedule'
        //     }
        // },
    },
    init: function() {
    	console.log('Initialized Users! This happens before the Application launch() function is called');
    	return;
    }
});