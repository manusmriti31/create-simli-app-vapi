
export default function VideoBox(props: any) {
    return (
        <div className="w-full h-full flex rounded-sm overflow-hidden items-center justify-center bg-black/50">
            <video ref={props.video} autoPlay playsInline id="simli_video" className="w-full h-full object-cover"></video>
            <audio ref={props.audio} autoPlay id="simli_audio" ></audio>
        </div>
    );
}