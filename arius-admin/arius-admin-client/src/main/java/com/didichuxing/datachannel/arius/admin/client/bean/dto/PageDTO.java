package com.didichuxing.datachannel.arius.admin.client.bean.dto;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * @author lyn
 * @date 2021/09/29
 **/
@Data
@NoArgsConstructor
@AllArgsConstructor
@ApiModel(description = "分页实体")
public class PageDTO extends BaseDTO{
    @ApiModelProperty("起始点")
    private Long from;

    @ApiModelProperty("当前页数量")
    private Long size;
}
