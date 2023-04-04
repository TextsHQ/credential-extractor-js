var chrome = require('../index');

chrome.getCookies('https://chat.openai.com', function (err, cookies) {

	if (err) {
		console.error(err);
		return;
	}

	console.log(cookies);

});
