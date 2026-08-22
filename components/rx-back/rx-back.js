Component({
  options: {
    virtualHost: true
  },
  properties: {
    theme: {
      type: String,
      value: 'light'
    }
  },
  methods: {
    handleBack() {
      this.triggerEvent('back');
    }
  }
});
