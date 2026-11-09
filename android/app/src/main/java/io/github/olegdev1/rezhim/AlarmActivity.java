package io.github.olegdev1.rezhim;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Full-screen alarm over the lock screen: big clock and one big «Я встал». */
public class AlarmActivity extends Activity {

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable tick = new Runnable() {
        @Override
        public void run() {
            update();
            handler.postDelayed(this, 1000);
        }
    };

    private String group;
    private TextView title;
    private TextView clock;
    private TextView state;
    private Button stop;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        setShowWhenLocked(true);
        setTurnScreenOn(true);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(0xFF0B0B0A);
        int pad = dp(28);
        root.setPadding(pad, pad, pad, pad);

        title = text(26, 0xFF86B8A2, true);
        clock = text(96, 0xFFECE7DC, true);
        state = text(18, 0xFF8D877B, false);
        stop = new Button(this);
        stop.setAllCaps(false);
        stop.setTextSize(TypedValue.COMPLEX_UNIT_SP, 30);
        stop.setTypeface(Typeface.DEFAULT_BOLD);
        stop.setTextColor(0xFF0E1F18);
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(0xFF86B8A2);
        bg.setCornerRadius(dp(32));
        stop.setBackground(bg);
        stop.setOnClickListener(v -> {
            EventReceiver.dismissGroup(this, group);
            finish();
        });

        root.addView(title);
        root.addView(clock);
        root.addView(state);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, dp(120));
        lp.topMargin = dp(48);
        root.addView(stop, lp);
        setContentView(root);
        read(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        read(intent);
    }

    private void read(Intent i) {
        group = i.getStringExtra("group");
        String t = i.getStringExtra("title");
        title.setText(t != null ? t : "Будильник");
        stop.setText(group != null && group.startsWith("wake-") ? "Я встал" : "Стоп");
        update();
    }

    private void update() {
        clock.setText(Notifier.hm(System.currentTimeMillis()));
        if (AlarmService.isRinging(group)) {
            state.setText("Вставай");
            return;
        }
        Store.Ev next = Scheduler.nextInGroup(this, group);
        if (next == null) finish();
        else state.setText("Тишина · следующий сигнал в " + Notifier.hm(next.at));
    }

    @Override
    protected void onResume() {
        super.onResume();
        handler.post(tick);
    }

    @Override
    protected void onPause() {
        super.onPause();
        handler.removeCallbacks(tick);
    }

    private TextView text(int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        v.setTextColor(color);
        v.setGravity(Gravity.CENTER);
        if (bold) v.setTypeface(Typeface.DEFAULT_BOLD);
        return v;
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
