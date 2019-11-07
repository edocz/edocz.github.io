var scroll = new SmoothScroll();
var anchorRecent = document.querySelector('#recent');
var anchorNavbar = document.querySelector('#navbar');

$('.scroll-down-bar>ul').click(function() {
    scroll.animateScroll(anchorRecent);
});

$('#scroll-top-button').click(function() {
    scroll.animateScroll(anchorNavbar);
});

$("#navbar").autoHidingNavbar({
    showOnBottom: false,
    showOnUpscroll: false,
    animationDuration: 300
});

window.onscroll = function() {
    if ((document.documentElement.clientHeight - 400) < document.documentElement.scrollTop) {
        $('#scroll-top-button').show();
    } else {
        $('#scroll-top-button').hide();
    }
}