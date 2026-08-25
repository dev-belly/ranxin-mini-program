Component({
  options: {
    virtualHost: true
  },
  properties: {
    theme: {
      type: String,
      value: 'light'
    },
    label: {
      type: String,
      value: '返回上一页'
    }
  },
  methods: {
    handleBack() {
      this.triggerEvent('back');
    }
  }
});
