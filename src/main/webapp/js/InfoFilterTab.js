var InfoFilterTab = function (filters) {

    // private variables
    var workspaceKey;
    var view;

    // constants for operator options
    var OPTION_EQ   = "<option value='eq'>=</option>";
    var OPTION_GT   = "<option value='gt'>&gt;</option>";
    var OPTION_GTEQ = "<option value='gteq'>&#x2265;</option>";
    var OPTION_LT   = "<option value='lt'>&lt;</option>";
    var OPTION_LTEQ = "<option value='lteq'>&#x2264;</option>";
    var OPTION_NE   = "<option value='ne'>&#x2260;</option>";

    // initialize the file input field
    $(":file").filestyle({buttonText: ''});

    // jQuery validate plugin config
    $('#info_tab_form').validate(
        {
            rules:
            {
                int_field_value: {
                    required: true,
                    integer: true
                },
                float_field_value: {
                    required: true,
                    number: true
                }
            },
            highlight: function(element) {
                $(element).parent().addClass('control-group error');
            },
            success: function(element) {
                $(element).parent().removeClass('control-group error');
            }
        }
    );

    var ListView = Backbone.View.extend({

        initialize: function()
        {
            this.listenTo(filters, 'add',    this.addOne);
            this.listenTo(filters, 'remove', this.removeOne);
            this.listenTo(filters, 'reset',  this.removeAll);
        },

        render: function()
        {
        },

        addOne: function(filter)
        {
            $('#info_field_list').append("<option value='"+filter.get("id")+"'>"+filter.get("name")+"</option>");

            // check if this is the 1ST added
            if (filters.models.length == 1)
            {
                // simulate user choosing the 1st INFO field
                infoFieldChanged(workspaceKey);
            }
        },

        removeOne: function(filter)
        {
            $("#info_field_list option[value='"+filter.get("id")+"']").remove();
        },

        removeAll: function()
        {
            $('#info_field_list').empty();
        }
    });

    view = new ListView();

    // listen for selection changes to list
    $('#info_field_list').change(function()
    {
        infoFieldChanged(workspaceKey);
    });

    /**
     * Gets the currently selected Filter model.
     *
     * @returns {*}
     */
    function getSelectedFilter()
    {
        var filterID = $('#info_field_list').val();
        return INFO_FILTER_LIST.findWhere({id: filterID});
    }

    /**
     * Dynamically alters the tab's "operator" and "value" areas based on
     * the selected INFO field.
     *
     * @param workspaceKey
     */
    function infoFieldChanged(workspaceKey)
    {
        // get selected filter
        var filter = getSelectedFilter();

        // value DIV area
        var valueDiv = $("#info_value_div");
        // clear div value area
        valueDiv.empty();

        // operator list
        var opList = $("#info_operator_list");
        // clear operator list
        opList.empty();

        var includeNullsHTML =
            "<div class='row-fluid checkbox'><label><input type='checkbox' id='include_nulls'> Keep variants with missing annotation (+null)</label></div>";

        switch (filter.get("category"))
        {
            case FilterCategory.INFO_FLAG:
                opList.append(OPTION_EQ);
                //opList.append(OPTION_NE); // not supported by server-side
                valueDiv.append(
                    "<div id='info_flag_radio_group' class='form-inline'>" +
                        "<label class='radio inline' style='margin-right:20px;'><input type='radio' name='flag_group' id='true' checked='true'> True</label>" +
                        "<label class='radio inline'><input type='radio' name='flag_group' id='false'> False</label>" +
                    "</div>"
                );
                break;
            case FilterCategory.INFO_INT:
                opList.append(OPTION_EQ);
                opList.append(OPTION_GT);
                opList.append(OPTION_GTEQ);
                opList.append(OPTION_LT);
                opList.append(OPTION_LTEQ);
                opList.append(OPTION_NE);
                valueDiv.append("<div class='row-fluid' id='value_div'><input name='int_field_value' class='input-mini' value='0'></div>");
                valueDiv.append("<div class='row-fluid'><div class='span12'><hr></div></div>");
                valueDiv.append(includeNullsHTML);
                break;
            case FilterCategory.INFO_FLOAT:
                opList.append(OPTION_EQ);
                opList.append(OPTION_GT);
                opList.append(OPTION_GTEQ);
                opList.append(OPTION_LT);
                opList.append(OPTION_LTEQ);
                opList.append(OPTION_NE);
                valueDiv.append("<div class='row-fluid' id='value_div'><input name='float_field_value' class='input-mini' step='any' value='0.0'></div>");
                valueDiv.append("<div class='row-fluid'><div class='span12'><hr></div></div>");
                valueDiv.append(includeNullsHTML);
                break;
            case FilterCategory.INFO_STR:
                opList.append(OPTION_EQ);
                opList.append(OPTION_NE);

                valueDiv.append("<div class='row-fluid'><div class='dropdown' id='info_field_dropdown_checkbox' name='str_field_value'></div></div>");
                valueDiv.append("<div class='row-fluid'><div class='span12'><hr></div></div>");
                valueDiv.append(includeNullsHTML);

                // dynamically query to populate dropdown
                var fieldName = filter.get("name");
                $.ajax({
                    url: "/mongo_svr/ve/typeahead/w/" + workspaceKey + "/f/" + fieldName,
                    dataType: "json",
                    async: false,
                    success: function(json)
                    {
                        var fieldValues = json[fieldName];
                        if (typeof fieldValues === "undefined")
                        {
                            console.warn("INFO string field " + fieldName + " has no available values.");
                            fieldValues = new Array();
                        }

                        // sort values
                        fieldValues.sort(function(a,b) { return a.localeCompare(b) } );

                        var dropdownData = new Array();
                        for (var i = 0; i < fieldValues.length; i++)
                        {
                            dropdownData.push({id: i, label: fieldValues[i]});
                        }

                        var dropdownCheckbox = $("#info_field_dropdown_checkbox");
                        dropdownCheckbox.dropdownCheckbox({
                            autosearch: true,
                            hideHeader: false,
                            data: dropdownData
                        });
                    },
                    error: function(jqXHR, textStatus)
                    {
                        $("#message_area").html(_.template(ERROR_TEMPLATE,{message: JSON.stringify(jqXHR)}));
                    }
                });
                break;
        }

        // re-validate since form has changed
        $('#info_tab_form').valid();
    }

    // public API
    return {
        /**
         *
         * @param workspaceKey
         */
        initialize: function(ws)
        {
            workspaceKey = ws;

            // check to see whether we have any INFO annotation
            if (filters.length > 0)
                $('#no_info_annotation_warning').toggle(false);
            else
                $('#no_info_annotation_warning').toggle(true);
        },

        /**
         * Performs validation on the user's current selections/entries.
         */
        validate: function()
        {
            var filter = getSelectedFilter();

            switch (filter.get("category"))
            {
                case FilterCategory.INFO_STR:
                    var numChecked = $("#info_field_dropdown_checkbox").dropdownCheckbox("checked").length;
                    if(numChecked > 0)
                    {
                        $("#info_field_value_validation_warning").remove();
                        return true;
                    }
                    else
                    {
                        if ($("#info_field_value_validation_warning").length == 0)
                            $("#info_value_div").append('<div class="row-fluid" id="info_field_value_validation_warning"><div class="alert alert-error">At least 1 string should be checked.</div></div>');

                        return false;
                    }
                    break
                default:
                    return $('#info_tab_form').valid();
            }
        },

        /**
         * Gets the selected filter.
         *
         * @return Filter model
         */
        getFilter: function()
        {
            // get selected filter
            var filterID = $('#info_field_list').val();

            // make a new identical copy of the model (because the same model can be added multiple times).
            var filter = filters.findWhere({id: filterID}).clone();

            // assign new uid
            filter.set("id", guid());

            var valueDiv = $("#info_value_div");
            switch (filter.get("category"))
            {
                case FilterCategory.INFO_FLAG:
                    var radioId =  $('#info_flag_radio_group input[type=radio]:checked').attr('id');
                    if (radioId == 'true')
                    {
                        filter.set("value", true);
                    }
                    else
                    {
                        filter.set("value", false);
                    }
                    break;
                case FilterCategory.INFO_INT:
                case FilterCategory.INFO_FLOAT:
                    filter.set("value", $("#info_value_div input").val());
                    filter.set("includeNulls", $("#include_nulls").is(':checked'));
                    break;
                case FilterCategory.INFO_STR:
                    var filter = filters.findWhere({id: filterID});
                    var checkedVals = $("#info_field_dropdown_checkbox").dropdownCheckbox("checked");
                    var valueStr = "";
                    var valueArr = new Array();
                    for (var i=0; i < checkedVals.length; i++)
                    {
                        valueArr.push(checkedVals[i].label);
                    }
                    filter.set("value", valueArr);
                    filter.set("includeNulls", $("#include_nulls").is(':checked'));
                    break;
            };

            // get selected operator
            var operator = FilterOperator.EQ; // default
            var selectedOperatorOpt = $('#info_operator_list');
            if (typeof selectedOperatorOpt !== "undefined")
            {
                switch(selectedOperatorOpt.val())
                {
                    case 'eq':
                        operator = FilterOperator.EQ;
                        break;
                    case 'gt':
                        operator = FilterOperator.GT;
                        break;
                    case 'gteq':
                        operator = FilterOperator.GTEQ;
                        break;
                    case 'lt':
                        operator = FilterOperator.LT;
                        break;
                    case 'lteq':
                        operator = FilterOperator.LTEQ;
                        break;
                    case 'ne':
                        operator = FilterOperator.NE;
                        break;
                }
            }
            filter.set("operator", operator);
            return filter;
        }
    };

};