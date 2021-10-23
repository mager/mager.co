---
title: How to setup a "front gate" channel in Discord
date: "2021-10-23T19:00:00.000Z"
description: Quick tutorial for making your Discord server a little safer.
template: post
slug: discord-front-gate-entrance-channel
tags:
  - "Tutorial"
  - "Discord"
  - "Security"
category: "Community"
---

If you're building a Discord community, security and safety are the top priorities. By creating a "front gate" channel, you require users to react to a message to gain entry into the rest of your server.

In this tutorial, you'll learn about Discord roles and we'll also play with the [MEE6 bot](https://mee6.xyz/). Here's what we're building:

![](/media/2021-10-23-discord-front-gate/front-gate.png)

Here's a good post about [creating a Discord server](https://blog.discord.com/starting-your-first-discord-server-4dcacda8dad5) if you're new to this app.

## Roles & Permissions

In Discord, think of roles as groups of users with certain permissions. And think of permissions as things that you are allowed to do in the server, like create channels or ban members. A full list of permissions can be found in the [Discord developer docs](https://discord.com/developers/docs/topics/permissions). Here's a good [FAQ about permissions](https://support.discord.com/hc/en-us/articles/206029707).

The first step is to create a "general" role that all users will get when they react to your front gate message. Go to your Server Settings > Roles > Create Role. Give your role a name (I used "Member" but you can make it anything you want).

![](/media/2021-10-23-discord-front-gate/roles-1.png)

Use the default permissions for this role.

![](/media/2021-10-23-discord-front-gate/roles-2.png)

## Create a #front-gate channel

Create a new channel called #front-gate, or name it whatever you want.

![](/media/2021-10-23-discord-front-gate/front-gate-2.png)

## MEE6 Bot

Next, sign up for [MEE6](https://mee6.xyz/), which is an amazing Discord bot. Select your server, and enable the Reaction Roles plugin.

![](/media/2021-10-23-discord-front-gate/reaction-roles.png)

Craft the message that your users will have to react to:

![](/media/2021-10-23-discord-front-gate/mee6.png)

Then choose an emoji and a role:

![](/media/2021-10-23-discord-front-gate/mee6-2.png)

Save it and you should see the message pop up in your new channel:

![](/media/2021-10-23-discord-front-gate/front-gate-3.png)

## Lock the other channels

So, the last step is to lock down all the channels that you want behind the gate.

Click the cog next to each channel name and navigate to the Permissions tab. Toggle on "Private Channel" and then add your new role in the "Who can access this channel?" section:

![](/media/2021-10-23-discord-front-gate/channel-lock.png)

If you already have users in your server, make sure to give them the Member role (or make them react to your emoji in #front-gate). To add the role to existing users, go to Server Settings > Roles then find your role. Click Manage Members, and them to the role:

![](/media/2021-10-23-discord-front-gate/existing-members.png)

## Conclusion

Now your server has one more layer of security. It's not bulletproof though: it's not unlikely that a bot could find a way to react to this message and gain access to your server.

One nice feature of the default permissions is that this role does not have permission to message other members on your server:

![](/media/2021-10-23-discord-front-gate/no-message-members.png)

This reduces a lot of spam and junk on your server.

I hope this tutorial helped you with your Discord server. [Hit me up on Twitter](https://twitter.com/mager) with your comments and feedback!
