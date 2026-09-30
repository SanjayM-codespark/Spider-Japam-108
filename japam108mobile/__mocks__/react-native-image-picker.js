/**
 * The picker opens a native gallery. The mock reports that the user cancelled,
 * which is the branch the app already handles.
 */
module.exports = {
  __esModule: true,
  launchImageLibrary: jest.fn(async () => ({didCancel: true})),
  launchCamera: jest.fn(async () => ({didCancel: true})),
  launchMultipleImageLibrary: jest.fn(async () => ({didCancel: true})),
  requestMediaLibraryPermissions: jest.fn(async () => ({granted: false})),
  MediaType: {photo: 'photo', video: 'video'},
  ImagePickerResponseType: {cancel: 'cancel', assets: 'assets'},
};
