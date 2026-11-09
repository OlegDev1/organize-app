package io.github.olegdev1.rezhim;

import android.content.Context;
import android.content.SharedPreferences;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Iterator;
import java.util.List;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Everything the native side keeps: scheduled events, dismissed alarm groups, events for the web app. */
final class Store {

    /** One scheduled moment (see src/lib/schedule.ts). `code` is the AlarmManager request code. */
    static final class Ev {
        int code;
        long at;
        String kind;
        String title;
        String text;
        long target;
        int sound;
        long ringMs;
        String group;
        List<String> actions = new ArrayList<>();

        static Ev from(JSONObject o, int code) {
            Ev e = new Ev();
            e.code = code;
            e.at = o.optLong("at");
            e.kind = o.optString("kind");
            e.title = o.optString("title");
            e.text = o.optString("text");
            e.target = o.optLong("target", 0);
            e.sound = o.optInt("sound", 0);
            e.ringMs = o.optLong("ringMs", 60_000);
            e.group = o.has("group") ? o.optString("group") : null;
            JSONArray a = o.optJSONArray("actions");
            if (a != null) for (int i = 0; i < a.length(); i++) e.actions.add(a.optString(i));
            return e;
        }

        JSONObject toJson() throws JSONException {
            JSONObject o = new JSONObject();
            o.put("code", code).put("at", at).put("kind", kind).put("title", title).put("text", text);
            o.put("target", target).put("sound", sound).put("ringMs", ringMs);
            if (group != null) o.put("group", group);
            o.put("actions", new JSONArray(actions));
            return o;
        }

        boolean isLive() {
            return "live".equals(kind) || "clear".equals(kind);
        }
    }

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences("rezhim", Context.MODE_PRIVATE);
    }

    static List<Ev> events(Context c) {
        List<Ev> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs(c).getString("events", "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                out.add(Ev.from(o, o.getInt("code")));
            }
        } catch (JSONException ignored) {
        }
        return out;
    }

    static void saveEvents(Context c, List<Ev> list) {
        JSONArray arr = new JSONArray();
        try {
            for (Ev e : list) arr.put(e.toJson());
        } catch (JSONException ignored) {
        }
        prefs(c).edit().putString("events", arr.toString()).apply();
    }

    static Ev find(Context c, int code) {
        for (Ev e : events(c)) if (e.code == code) return e;
        return null;
    }

    /** Groups he stopped with «Я встал» in the last 3 days. */
    static Set<String> dismissed(Context c) {
        Set<String> out = new HashSet<>();
        try {
            JSONObject o = new JSONObject(prefs(c).getString("dismissed", "{}"));
            long cutoff = System.currentTimeMillis() - 3L * 24 * 3600_000;
            Iterator<String> keys = o.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                if (o.optLong(k) > cutoff) out.add(k);
            }
        } catch (JSONException ignored) {
        }
        return out;
    }

    static void dismiss(Context c, String group) {
        try {
            JSONObject o = new JSONObject(prefs(c).getString("dismissed", "{}"));
            long cutoff = System.currentTimeMillis() - 3L * 24 * 3600_000;
            JSONObject kept = new JSONObject();
            Iterator<String> keys = o.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                if (o.optLong(k) > cutoff) kept.put(k, o.optLong(k));
            }
            kept.put(group, System.currentTimeMillis());
            prefs(c).edit().putString("dismissed", kept.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    /** Things that happened while the web app was closed (e.g. «Я встал» on the alarm screen). */
    static synchronized void pushAppEvent(Context c, JSONObject e) {
        try {
            JSONArray arr = new JSONArray(prefs(c).getString("pending", "[]"));
            arr.put(e);
            prefs(c).edit().putString("pending", arr.toString()).apply();
        } catch (JSONException ignored) {
        }
    }

    static synchronized JSONArray takeAppEvents(Context c) {
        JSONArray arr;
        try {
            arr = new JSONArray(prefs(c).getString("pending", "[]"));
        } catch (JSONException e) {
            arr = new JSONArray();
        }
        prefs(c).edit().putString("pending", "[]").apply();
        return arr;
    }

    private Store() {}
}
