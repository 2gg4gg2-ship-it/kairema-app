package com.kairema.app.update

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class UpdateRulesTest {
    private val repo = "2gg4gg2-ship-it/kairema-app"
    private val good = "https://github.com/$repo/releases/download/v1.0.0/Kairema-1.0.0.apk"

    @Test fun repoNames() {
        assertTrue(UpdateRules.repoOk(repo))
        assertFalse(UpdateRules.repoOk(""))
        assertFalse(UpdateRules.repoOk("only-owner"))
        assertFalse(UpdateRules.repoOk("a/b/c"))
        assertFalse(UpdateRules.repoOk("a/b c"))
        assertFalse(UpdateRules.repoOk("../x"))
    }

    @Test fun acceptsReleaseDownload() {
        assertTrue(UpdateRules.urlOk(repo, good))
    }

    @Test fun rejectsOtherHostsSchemesAndRepos() {
        assertFalse(UpdateRules.urlOk(repo, good.replace("https://", "http://")))
        assertFalse(UpdateRules.urlOk(repo, good.replace("github.com", "evil.com")))
        assertFalse(UpdateRules.urlOk(repo, "https://github.com.evil.com/$repo/releases/download/v1/a.apk"))
        assertFalse(UpdateRules.urlOk(repo, "https://github.com/other/repo/releases/download/v1/a.apk"))
        assertFalse(UpdateRules.urlOk(repo, "https://github.com/$repo/archive/main.zip"))
        assertFalse(UpdateRules.urlOk(repo, "https://github.com/$repo/releases/download/../../x"))
        assertFalse(UpdateRules.urlOk(repo, "https://user@github.com/$repo/releases/download/v1/a.apk"))
        assertFalse(UpdateRules.urlOk(repo, "https://github.com:8443/$repo/releases/download/v1/a.apk"))
        assertFalse(UpdateRules.urlOk(repo, "file:///sdcard/a.apk"))
        assertFalse(UpdateRules.urlOk(repo, "not a url"))
        assertFalse(UpdateRules.urlOk("bad", good))
    }
}
