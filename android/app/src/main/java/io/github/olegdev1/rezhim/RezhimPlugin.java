package io.github.olegdev1.rezhim;

import android.Manifest;
import android.app.NotificationManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONException;
import org.json.JSONObject;

/** Bridge for the web app (src/lib/native.svelte.ts). */
@CapacitorPlugin(
        name = "Rezhim",
        permissions = {@Permission(alias = "notifications", strings = {Manifest.permission.POST_NOTIFICATIONS})})
public class RezhimPlugin extends Plugin {

    @Override
    public void load() {
        Notifier.channels(getContext());
        emitAction(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        emitAction(intent);
    }

    /** A button on the live notification (e.g. «Принял ночную») opened the app. */
    private void emitAction(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("rezhim_action");
        if (action == null) return;
        intent.removeExtra("rezhim_action");
        JSObject data = new JSObject();
        data.put("action", action);
        notifyListeners("action", data, true);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        JSArray events = call.getArray("events", new JSArray());
        Scheduler.replace(getContext(), events);
        call.resolve();
    }

    @PluginMethod
    public void takeEvents(PluginCall call) {
        JSObject r = new JSObject();
        r.put("events", Store.takeAppEvents(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void status(PluginCall call) {
        NotificationManager nm = getContext().getSystemService(NotificationManager.class);
        JSObject r = new JSObject();
        r.put("notifications", nm.areNotificationsEnabled());
        r.put("exact", Scheduler.canExact(getContext()));
        r.put("fullScreen", Build.VERSION.SDK_INT < 34 || nm.canUseFullScreenIntent());
        r.put("promoted", Build.VERSION.SDK_INT >= 36 && nm.canPostPromotedNotifications());
        r.put("sdk", Build.VERSION.SDK_INT);
        call.resolve(r);
    }

    @PluginMethod
    public void requestNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "notificationsResult");
        } else call.resolve();
    }

    @PermissionCallback
    private void notificationsResult(PluginCall call) {
        call.resolve();
    }

    /** Opens the system screen where he can allow what is missing. */
    @PluginMethod
    public void openSettings(PluginCall call) {
        String which = call.getString("which", "notifications");
        String pkg = getContext().getPackageName();
        Intent i;
        if ("exact".equals(which) && Build.VERSION.SDK_INT >= 31)
            i = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + pkg));
        else if ("fullScreen".equals(which) && Build.VERSION.SDK_INT >= 34)
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + pkg));
        else i = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, pkg);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);
        call.resolve();
    }

    /** Rings a short test alarm in a few seconds (lock the phone to see the full screen). */
    @PluginMethod
    public void testAlarm(PluginCall call) {
        int seconds = call.getInt("seconds", 10);
        try {
            JSONObject o = new JSONObject();
            o.put("at", System.currentTimeMillis() + seconds * 1000L);
            o.put("kind", "alarm").put("title", "Проверка будильника").put("text", "Так зазвонит утром");
            o.put("sound", 0).put("ringMs", 20_000).put("group", "test-" + System.currentTimeMillis());
            JSArray list = new JSArray();
            for (Store.Ev e : Store.events(getContext())) list.put(e.toJson());
            list.put(o);
            Scheduler.replace(getContext(), list);
        } catch (JSONException ignored) {
        }
        call.resolve();
    }
}
