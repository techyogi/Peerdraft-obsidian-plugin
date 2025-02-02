import { Modal, Plugin, PluginSettingTab, Setting, requestUrl } from "obsidian";
import { createRandomId } from "./tools";
import { refreshSubscriptionData } from "./subscription";

export interface Settings {
  signaling: Array<string>,
  subscriptionAPI: string,
  connectAPI: string,
  basePath: string,
  name: string,
  oid: string,
  plan: {
    type: "hobby" | "professional"
    email?: string
  },
  duration: number
}

const DEFAULT_SETTINGS: Settings = {
  basePath: "https://www.peerdraft.app/cm/",
  subscriptionAPI: "https://www.peerdraft.app/subscription",
  connectAPI: "https://www.peerdraft.app/subscription/connect",
  name: "",
  signaling: ["wss://www.peerdraft.app/signal"],
  oid: createRandomId(),
  plan: {
    type: "hobby",
    email: ""
  },
  duration: 0
}

const FORCE_SETTINGS: Partial<Settings> = {
  basePath: "https://www.peerdraft.app/cm/",
  subscriptionAPI: "https://www.peerdraft.app/subscription",
  connectAPI: "https://www.peerdraft.app/subscription/connect",
  signaling: ["wss://www.peerdraft.app/signal"],
}

export const migrateSettings = async (plugin: Plugin) => {
  const oldSettings = await getSettings(plugin)
  const newSettings = Object.assign({}, DEFAULT_SETTINGS, oldSettings, FORCE_SETTINGS)
  await saveSettings(newSettings, plugin)
}

export const getSettings = async (plugin: Plugin) => {
  const settings = await plugin.loadData() as Settings
  return settings
}

export const saveSettings = async (settings: Settings, plugin: Plugin) => {
  await plugin.saveData(settings)
}

export const renderSettings = async (el: HTMLElement, plugin: Plugin) => {
  el.empty();

  const settings = await getSettings(plugin)

  el.createEl("h1", { text: "What's your name?" });

  const setting = new Setting(el)
  setting.setName("Name")
  setting.setDesc("This name will be shown to your collaborators")
  setting.addText((text) => {
    text.setValue(settings.name)
    text.onChange(async (value) => {
      settings.name = value
      await saveSettings(settings, plugin);
    })
  })

  el.createEl("h1", { text: "Your subscription" })
  if (settings.plan.type === "hobby") {
    el.createEl("div", { text: "You are on the free Hobby plan. You can collaborate with your peers for up to 2.5 hours a month. For unlimited collaboration time, sign-up for the Professional plan at 30 USD/year." })
    el.createEl("p")
    el.createEl("div", { text: `You have used Peerdraft for ${settings.duration} minutes so far.` })
    el.createEl("p")

    new Setting(el)
      .setName("Subscribe")
      .addButton(button => {
        button.setButtonText("Buy professional plan")
        button.setCta()
        button.onClick((e) => {
          window.open(`https://peerdraft.app/checkout?oid=${settings.oid}`)
        })
      })

    let connectEmail = ""
    new Setting(el)
      .setName("Use existing subscription")
      .setDesc("If you already bought a subscription, enter the e-mail address associated with it and click on `Connect`.")
      .addText((text) => {
        text.setPlaceholder("me@test.com")
        text.onChange((value) => {
          connectEmail = value
        })
      })
      .addButton(button => {
        button.setButtonText("Connect")
        button.onClick(async (e) => {
          console.log("trying to get sub")
          const data = await requestUrl({
            url: settings.connectAPI,
            method: 'POST',
            contentType: "application/json",
            body: JSON.stringify({
              email: connectEmail,
              oid: settings.oid
            })
            
          }).json
          console.log(data)
          if (data && data.plan) {
            settings.plan = data.plan
            saveSettings(settings, plugin),
              await renderSettings(el, plugin)
          }
        })
      })

  } else if (settings.plan.type === "professional") {
    el.createEl("div", { text: "You are on the professional plan for unlimited collaboration. Happy peerdrafting." })
    el.createEl("p")
    el.createEl("div", { text: `You have used Peerdraft for ${settings.duration} minutes so far.` })
    el.createEl("p")
  }

  new Setting(el)
  .setName("Refresh subscription data")
  .setDesc("If you just subscribed or connected your license, click here to refresh your subscription information.")
  .addButton((button) => {
    button.setButtonText("Refresh")
    button.onClick(async (e) => {
      refreshSubscriptionData(plugin)
      renderSettings(el, plugin)
    })
  })

  el.createEl("h1", { text: "Help" })
  const div = el.createDiv()
  div.createSpan({ text: "If you need any help, " })
  div.createEl("a", {
    text: "get in touch",
    attr: {
      href: "mailto:dominik@peerdraft.app"
    }
  })
  div.createSpan({ text: '.' })

}

export const createSettingsTab = (plugin: Plugin) => {
  return new class extends PluginSettingTab {
    async display() {
      await renderSettings(this.containerEl, plugin)
    }
  }(plugin.app, plugin)
}

export const createSettingsModal = (plugin: Plugin) => {
  return new class extends Modal {

    async onOpen() {
      const el = this.contentEl
      el.empty();

      const settings = await getSettings(plugin)

      el.createEl("h1", { text: "What's your name?" });

      const setting = new Setting(el)
      setting.setName("Name")
      setting.setDesc("This name will be shown to your collaborators")
      setting.addText((text) => {
        text.setValue(settings.name)
        text.onChange(async (value) => {
          settings.name = value
          await saveSettings(settings, plugin);
        })
      })
    }

    onClose() {
      this.contentEl.empty()
    }

  }(plugin.app)
}