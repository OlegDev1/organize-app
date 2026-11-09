package io.github.olegdev1.rezhim;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(RezhimPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
