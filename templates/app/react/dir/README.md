Extension for youtube music ( pocket mode )

1. Chrome extension (popup mode)
2. Will disable youtube music play buttons and instead place invokers to the main extension
3. Will allow following features
	- Play/Pause
	- Creating custom playlist -> will have to add option for export and import
	- Play screen with backdrop of the singer photo
  - Will add keyboard shortcuts for quick / smart access
4. Will connect to a specific tab of youtube music. (this tab instance will be controlled by the extension)
	- Add a discovery on the extension popup to attach to current instance of tab
	- [Accessing tab contentScript](https://developer.chrome.com/docs/extensions/reference/tabs/)
	- [for tab and extension communication](https://stackoverflow.com/questions/5498893/chrome-extension-how-to-get-key-events#answer-71567874)
	- [for setting a certain tab with tabId as current tab](https://developer.chrome.com/docs/extensions/reference/tabs/#method-update)

