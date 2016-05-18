Ext.define('Zermelo.ErrorManager', {
	alternateClassName: 'ErrorManager',
	singleton: true,
	status: true,
	queue: [],

	getStatus: function() {
		return this.status;
	},

	setStatus: function(newStatus) {
		this.status = newStatus;
	},

	addError: function(error) {
		this.setStatus(true);
		this.queue.push(error);
		console.log(this.queue);
	},

	showFirstError: function() {
		this.showErrorBox(this.queue[0]);
	},

	showErrorBox: function(text) {
		console.log(text);
		Ext.Msg.show({
			items: [{
				xtype: 'label',
				cls: 'zermelo-error-messagebox',
				locales: {
					html: text
				}
			}],
			buttons: [{
				itemId: 'ok',
				locales: {
					text: 'ok',
				},
				ui: 'normal'
			}],
			modal: true,
		});
		Ext.Function.defer(function() {
			console.log(Ext.Msg.isHidden())
		}, 1000);
		return;
	},
})