package io.github.olegdev1.rezhim;

import android.app.Notification;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.database.Cursor;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

/** Rings one alarm of a series: alarm-stream sound that gets louder, vibration, then stops after ringMs. */
public class AlarmService extends Service {

    private static volatile String ringingGroup;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private MediaPlayer player;
    private Vibrator vibrator;
    private float volume;

    static void start(Context c, Store.Ev e) {
        try {
            c.startForegroundService(new Intent(c, AlarmService.class).putExtra("code", e.code));
        } catch (RuntimeException ex) {
            // Not allowed to ring from here (no exact-alarm permission): at least notify.
            Notifier.remind(c, e);
        }
    }

    static void stopIfGroup(Context c, String group) {
        if (group.equals(ringingGroup)) c.stopService(new Intent(c, AlarmService.class));
    }

    static boolean isRinging(String group) {
        return group != null && group.equals(ringingGroup);
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        Store.Ev e = intent == null ? null : Store.find(this, intent.getIntExtra("code", -1));
        if (e == null) {
            e = new Store.Ev();
            e.title = "Будильник";
            e.text = "";
            e.ringMs = 0;
        }
        Notification n = Notifier.alarm(this, e);
        if (Build.VERSION.SDK_INT >= 29) startForeground(Notifier.ID_ALARM, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(Notifier.ID_ALARM, n);
        if (e.ringMs <= 0) {
            stopSelf();
            return START_NOT_STICKY;
        }

        Notifier.clearSeries(this);
        ringingGroup = e.group;
        handler.removeCallbacksAndMessages(null);
        play(e.sound);
        vibrate();
        handler.postDelayed(this::finishRing, e.ringMs);
        return START_NOT_STICKY;
    }

    private void finishRing() {
        Store.Ev next = Scheduler.nextInGroup(this, ringingGroup);
        stopSelf();
        if (next != null) Notifier.seriesWaiting(this, next);
    }

    private void play(int sound) {
        stopPlayer();
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build());
            player.setDataSource(this, pick(sound));
            player.setLooping(true);
            volume = 0.35f;
            player.setVolume(volume, volume);
            player.prepare();
            player.start();
            handler.postDelayed(new Runnable() {
                @Override
                public void run() {
                    if (player == null) return;
                    volume = Math.min(1f, volume + 0.05f);
                    player.setVolume(volume, volume);
                    if (volume < 1f) handler.postDelayed(this, 3000);
                }
            }, 3000);
        } catch (Exception ex) {
            stopPlayer();
        }
    }

    /** A different system alarm sound for each ring of the series. */
    private Uri pick(int n) {
        try {
            RingtoneManager rm = new RingtoneManager(this);
            rm.setType(RingtoneManager.TYPE_ALARM);
            Cursor cur = rm.getCursor();
            int count = cur.getCount();
            if (count > 0) {
                Uri u = rm.getRingtoneUri(n % count);
                if (u != null) return u;
            }
        } catch (Exception ignored) {
        }
        Uri d = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        return d != null ? d : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
    }

    private void vibrate() {
        vibrator = getSystemService(Vibrator.class);
        if (vibrator == null || !vibrator.hasVibrator()) return;
        AudioAttributes aa = new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build();
        vibrator.vibrate(VibrationEffect.createWaveform(new long[] {0, 900, 700}, 0), aa);
    }

    private void stopPlayer() {
        if (player == null) return;
        try {
            player.stop();
        } catch (Exception ignored) {
        }
        player.release();
        player = null;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        stopPlayer();
        if (vibrator != null) vibrator.cancel();
        ringingGroup = null;
        stopForeground(STOP_FOREGROUND_REMOVE);
        super.onDestroy();
    }
}
