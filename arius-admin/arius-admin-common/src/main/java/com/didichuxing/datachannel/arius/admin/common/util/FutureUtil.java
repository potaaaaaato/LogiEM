package com.didichuxing.datachannel.arius.admin.common.util;

import java.util.List;
import java.util.Map;
import java.util.concurrent.*;

import com.didiglobal.logi.log.ILog;
import com.didiglobal.logi.log.LogFactory;
import com.google.common.collect.Lists;
import lombok.NoArgsConstructor;
import org.apache.commons.collections4.CollectionUtils;
import org.apache.lucene.util.NamedThreadFactory;

@NoArgsConstructor
public class FutureUtil<T> {
    private static final ILog LOGGER = LogFactory.getLog(FutureUtil.class);

    private ThreadPoolExecutor  executor;
    private String              name;

    private Map<Long/*currentThreadId*/, List<Future<T>>> futuresMap;

    public final static FutureUtil<Void> DEAULT_FUTURE = FutureUtil.init("default");

    public void setExecutor(ThreadPoolExecutor executor){ this.executor = executor; }

    public ThreadPoolExecutor getExecutor() {return executor;}

    public void setFuturesMap(Map<Long, List<Future<T>>> futuresMap) {this.futuresMap = futuresMap;}

    public void setName(String name) {
        this.name = name;
    }

    public static <T> FutureUtil<T> init(String name, int corePoolSize, int maxPoolSize, int queueSize){
        FutureUtil<T> futureUtil = new FutureUtil<>();

        ThreadPoolExecutor exe = new ThreadPoolExecutor(corePoolSize, maxPoolSize, 3000, TimeUnit.MILLISECONDS,
                new LinkedBlockingDeque<>(queueSize),
                new NamedThreadFactory("Arius-admin-FutureUtil-" + name),
                new ThreadPoolExecutor.DiscardOldestPolicy());//对拒绝任务不抛弃，而是抛弃队列里面等待最久的一个线程，然后把拒绝任务加到队列。

        futureUtil.setExecutor(exe);
        futureUtil.setName(name);
        futureUtil.setFuturesMap(new ConcurrentHashMap<>());
        return futureUtil;
    }

    /**
     * 根据系统处理器的数目创建线程池
     *
     * @param name
     * @param queueSize
     * @param <T>
     * @return
     */
    public static <T> FutureUtil<T> initBySystemAvailableProcessors(String name, int queueSize) {
        int processorsNum = Runtime.getRuntime().availableProcessors();
        if (processorsNum >= 3) {
           return init(name, processorsNum, processorsNum, queueSize);
        }
        return init(name, 3, 3, queueSize);
    }

    /**
     * 不能在其他方法中调用此方法, 会导致不停创建线程池
     */
    public static <T> FutureUtil<T> init(String name){
        return FutureUtil.init(name, 5, 5, 100);
    }

    /**
     * 必须配合 waitResult使用 否则容易会撑爆内存
     * @param callable
     * @return
     */
    public FutureUtil<T> callableTask(Callable<T> callable){
        Long currentThreadId = Thread.currentThread().getId();

        List<Future<T>> futures = futuresMap.get(currentThreadId);
        if(CollectionUtils.isEmpty(futures)){
            futures = Lists.newCopyOnWriteArrayList();
        }

        futures.add(executor.submit(callable));
        futuresMap.put(currentThreadId, futures);
        return this;
    }

    /**
     * 必须配合 waitExecute使用 否则容易会撑爆内存
     * @param runnable
     * @return
     */
    public FutureUtil<T> runnableTask(Runnable runnable){
        Long currentThreadId = Thread.currentThread().getId();

        List<Future<T>> futures = futuresMap.get(currentThreadId);
        if(CollectionUtils.isEmpty(futures)){
            futures = Lists.newCopyOnWriteArrayList();
        }

        futures.add((Future<T>) executor.submit(runnable));
        futuresMap.put(currentThreadId, futures);
        return this;
    }

    public void waitExecute(long timeOutSeconds) {
        Long currentThreadId = Thread.currentThread().getId();

        List<Future<T>> currentFutures = futuresMap.get(currentThreadId);

        if(CollectionUtils.isEmpty(currentFutures)){return;}

        //CopyOnWriteArrayList 不支持迭代器进行remove 会抛出java.lang.UnsupportedOperationException
        for (Future<T> f : currentFutures) {
            try {
                f.get(timeOutSeconds, TimeUnit.SECONDS);
            } catch (Exception e) {
                f.cancel(true);
                LOGGER.error("class=FutureUtil||method=waitExecute||msg=exception", e);
            }finally {
                currentFutures.remove(f);
            }
        }

        if(CollectionUtils.isEmpty(currentFutures)){
            futuresMap.remove(currentThreadId);
        }

        if(!EnvUtil.isOnline()){
            LOGGER.info("class=FutureUtil||method={}||futuresSize={}||msg=all future excu done!",
                    name, currentFutures.size());
        }
    }

    public void waitExecute() {
        waitExecute(30);
    }

    public List<T> waitResult(long timeOutSeconds){
        Long currentThreadId = Thread.currentThread().getId();

        List<Future<T>> currentFutures = futuresMap.get(currentThreadId);

        List<T> list = Lists.newCopyOnWriteArrayList();

        if(CollectionUtils.isEmpty(currentFutures)){return list;}

        for (Future<T> f : currentFutures) {
            try {
                T t = f.get(timeOutSeconds, TimeUnit.SECONDS);
                if (t != null) {
                    list.add(t);
                }
            }catch (Exception e) {
                f.cancel(true);
                LOGGER.error("class=FutureUtil||method=waitResult||msg=exception", e);
            }finally {
                currentFutures.remove(f);
            }
        }

        if(CollectionUtils.isEmpty(currentFutures)){
            futuresMap.remove(currentThreadId);
        }

        if(!EnvUtil.isOnline()){
            LOGGER.info("class=FutureUtil||method={}||futuresSize={}||msg=all future excu done!",
                    name, currentFutures.size());
        }
        return list;
    }

    public List<T> waitResult(){
        return waitResult(30);
    }
}
